import { reviewedPreviewPath } from '../../shared/reviewed-previews';
import { useEffect, useRef, useState } from 'react';
import type { CollectionAssetPreview } from '../../shared/intelligence';
import { assetHref, readAssetQuery, safeAssetUrl } from '../lib/asset-library';
import { assetDestinationUrl } from '../lib/asset-destination';
import { navigateInApp } from '../lib/navigation';
import demos from '../../live-demos/manifest.json';
import { stageFit } from '../../shared/preview-stage';
import type { PreviewContentBox, PreviewSizeMessage } from '../../shared/preview-stage';
import type { DemoPropValues, DemoPropsMessage } from '../../shared/demo-props';

/**
 * loading: nothing confirmed yet, the stage shows a skeleton.
 * ready: the demo said so itself with a `uixo-preview-status` message. Only this is "Live".
 * embedded: a provider page that cannot send the message has loaded. It is a preview,
 * not a confirmed live demo, so it is never labelled "Live".
 * error: the demo failed or never answered.
 */
type PreviewStatus = 'loading' | 'ready' | 'embedded' | 'error';

const DEFAULT_PREVIEW_WIDTH = 480;
const UIABLE_PREVIEW_WIDTH = 280;
const UIABLE_PREVIEW_INSET = 12;
/** The detail stage is larger than a card, so small components may grow a little more. */
const DETAIL_STAGE_FIT = { maxScale: 2.8, fillWidth: 0.4, fillHeight: 0.5 };
function officialEmbedUrl(asset: CollectionAssetPreview): string | undefined {
  if (asset.preview?.kind !== 'embed') return undefined;
  const url = safeAssetUrl(asset.preview.url);
  if (!url) return undefined;
  const parsed = new URL(url);

  if (
    asset.providerId === 'animata' &&
    parsed.origin === 'https://animata.design' &&
    parsed.pathname === '/preview/iframe'
  )
    return url;

  if (
    asset.providerId === 'uiable' &&
    parsed.origin === 'https://uiable.com' &&
    /^\/preview\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(parsed.pathname) &&
    !parsed.search
  )
    return url;

  if (
    asset.providerId === 'flowbite-react' &&
    parsed.origin === 'https://flowbite-react.com' &&
    /^\/examples\/[A-Za-z0-9.]+$/.test(parsed.pathname) &&
    !parsed.search
  )
    return url;

  if (
    asset.providerId === 'heroui-web' &&
    parsed.origin === 'https://storybook-v3.heroui.com' &&
    parsed.pathname === '/iframe.html' &&
    /^[a-z0-9-]+--[a-z0-9-]+$/.test(parsed.searchParams.get('id') ?? '') &&
    parsed.searchParams.get('viewMode') === 'story' &&
    [...parsed.searchParams.keys()].every((key) => key === 'id' || key === 'viewMode')
  )
    return url;

  return undefined;
}

/** The designed failure state: what happened, and where to see the component instead. */
function PreviewUnavailable({ asset }: { asset: CollectionAssetPreview }) {
  return (
    <div className="asset-library-no-preview">
      <strong>Preview unavailable</strong>
      <a href={assetDestinationUrl(asset)} target="_blank" rel="noopener noreferrer">
        Open provider page ↗
      </a>
    </div>
  );
}

function LivePreview({
  asset,
  detail,
  src,
  external = false,
  fallbackImageUrl,
  stage = false,
  framed = false,
  zoom = true,
  theme: themeOverride,
  demoProps,
}: {
  asset: CollectionAssetPreview;
  detail: boolean;
  src: string;
  external?: boolean;
  fallbackImageUrl?: string;
  /** A card stage: the frame is transparent and reports its content size. */
  stage?: boolean;
  /** An opaque page on a card stage: drawn as an inset window. */
  framed?: boolean;
  /** On a stage, frame small content larger. Off for the detail page's phone width. */
  zoom?: boolean;
  /** Render the demo in this theme instead of the page's. */
  theme?: 'light' | 'dark';
  /** Props for a customisable demo, sent to the frame whenever they change. */
  demoProps?: DemoPropValues;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(detail);
  const [size, setSize] = useState({ width: 480, height: 330 });
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [contentBox, setContentBox] = useState<PreviewContentBox | null>(null);
  const [pageTheme, setTheme] = useState(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );
  const theme = themeOverride ?? pageTheme;
  const propsRef = useRef(demoProps);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = new ResizeObserver(() =>
      setSize({ width: element.clientWidth || 480, height: element.clientHeight || 330 }),
    );
    resize.observe(element);
    const intersection = new IntersectionObserver(
      (entries) => {
        const active = detail || entries[0].isIntersecting;
        setVisible(active);
        if (!active) setStatus('loading');
      },
      { rootMargin: '100px' },
    );
    intersection.observe(element);
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark'),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      resize.disconnect();
      intersection.disconnect();
      observer.disconnect();
    };
  }, [detail]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'uixo-preview-theme', theme }, '*');
  }, [theme]);

  // The sandboxed frame has an opaque origin, so messages go to '*'; they carry only
  // checked prop values, and the frame checks them again.
  const sendProps = (values: DemoPropValues | undefined) => {
    if (!values) return;
    const message: DemoPropsMessage = { type: 'uixo-preview-props', id: asset.id, values };
    frame.current?.contentWindow?.postMessage(message, '*');
  };
  useEffect(() => {
    propsRef.current = demoProps;
    sendProps(demoProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoProps]);

  useEffect(() => {
    if (external) return;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'uixo-preview-status' ||
        event.data.id !== asset.id
      )
        return;
      if (event.data.status === 'ready' || event.data.status === 'error') {
        setStatus(event.data.status);
      }
    };
    const propsReady = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'uixo-preview-props-ready' ||
        event.data.id !== asset.id
      )
        return;
      sendProps(propsRef.current);
    };
    const measure = (event: MessageEvent<PreviewSizeMessage>) => {
      if (
        !stage ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'uixo-preview-size' ||
        event.data.id !== asset.id
      )
        return;
      const box = event.data.box;
      if ([box.x, box.y, box.width, box.height].every(Number.isFinite)) setContentBox(box);
    };
    window.addEventListener('message', measure);
    window.addEventListener('message', receive);
    window.addEventListener('message', propsReady);
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('message', measure);
      window.removeEventListener('message', propsReady);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, external, stage]);

  useEffect(() => {
    if (!visible || status !== 'loading') return;
    const timeout = window.setTimeout(() => setStatus('error'), 20000);
    return () => window.clearTimeout(timeout);
  }, [visible, status]);

  // UIAble demos are complete responsive pages whose examples sit flush against
  // the page's leading edge. Give those pages a compact viewport and a small
  // visual stage so controls remain legible instead of looking wide or clipped.
  const uiableCard = asset.providerId === 'uiable' && !detail;
  const previewWidth = uiableCard ? UIABLE_PREVIEW_WIDTH : DEFAULT_PREVIEW_WIDTH;
  const previewInset = uiableCard ? UIABLE_PREVIEW_INSET : 0;
  const baseScale = detail ? 1 : Math.max(size.width - previewInset * 2, 1) / previewWidth;
  const fit =
    stage && zoom && !external
      ? stageFit(size, contentBox, baseScale, detail ? DETAIL_STAGE_FIT : undefined)
      : { scale: baseScale, x: 0, y: 0 };
  const scale = fit.scale;
  // A detail stage sizes its frame like a card does; the plain detail fills its box.
  const sized = !detail || stage;
  const showFallbackImage = status === 'error' && fallbackImageUrl && !fallbackFailed;

  return (
    <div
      ref={viewport}
      data-preview-state={status}
      data-preview-provider={asset.providerId}
      data-stage-fit={stage ? (scale > baseScale ? 'zoomed' : 'canvas') : undefined}
      className={`asset-live-viewport ${detail ? 'is-detail' : ''} ${
        showFallbackImage ? 'has-captured-fallback' : ''
      } ${framed ? 'is-framed' : ''}`}
    >
      {visible && (
        <iframe
          ref={frame}
          title={`Live ${asset.name} demo`}
          src={src}
          sandbox={external ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
          referrerPolicy="no-referrer"
          style={{
            colorScheme: theme,
            visibility: status === 'ready' || status === 'embedded' ? 'visible' : 'hidden',
            ...(!sized
              ? {}
              : {
                  width:
                    uiableCard || (!detail && scale === baseScale)
                      ? previewWidth
                      : size.width / scale,
                  height: Math.max(size.height - previewInset * 2, 1) / scale,
                  transform: uiableCard
                    ? `translate(${previewInset}px, ${previewInset}px) scale(${scale})`
                    : fit.x || fit.y
                      ? `translate(${fit.x}px, ${fit.y}px) scale(${scale})`
                      : `scale(${scale})`,
                }),
          }}
          onLoad={() => {
            // A load event also fires for error pages and before the demo paints, so a
            // frame of ours stays "loading" until its own ready message arrives.
            if (external) setStatus((current) => (current === 'loading' ? 'embedded' : current));
            else
              frame.current?.contentWindow?.postMessage({ type: 'uixo-preview-theme', theme }, '*');
          }}
        />
      )}
      {status === 'loading' && <span className="asset-live-skeleton" aria-hidden="true" />}
      {showFallbackImage &&
        (detail ? (
          <img
            className="asset-preview-fallback-image"
            src={fallbackImageUrl}
            alt={`${asset.name} captured component preview`}
            onError={() => setFallbackFailed(true)}
          />
        ) : (
          <a
            className="asset-capture-link"
            href={assetHref({ ...readAssetQuery(window.location.search), id: asset.id })}
            aria-label={`Inspect ${asset.name} screenshot`}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              navigateInApp(event.currentTarget.href);
            }}
          >
            <img
              className="asset-preview-fallback-image"
              src={fallbackImageUrl}
              alt={`${asset.name} captured component preview`}
              onError={() => setFallbackFailed(true)}
            />
          </a>
        ))}
      {status === 'error' && (!fallbackImageUrl || fallbackFailed) && (
        <PreviewUnavailable asset={asset} />
      )}
      {stage
        ? (status === 'ready' || status === 'embedded' || showFallbackImage) && (
            <small
              className="g-live"
              data-kind={status === 'ready' ? 'live' : status === 'embedded' ? 'embed' : 'capture'}
            >
              {status === 'ready' && <i aria-hidden="true" />}
              {status === 'ready' ? 'Live' : status === 'embedded' ? 'Preview' : 'Screenshot'}
            </small>
          )
        : status !== 'loading' &&
          !(status === 'error' && !showFallbackImage) && (
            <small className="actual-preview-label">
              {status === 'ready'
                ? 'Live · Try it'
                : status === 'embedded'
                  ? 'Preview'
                  : 'Screenshot · Live unavailable'}
            </small>
          )}
    </div>
  );
}

export function AssetPreview({
  asset,
  detail = false,
  stage = false,
  zoom = true,
  theme: themeOverride,
  demoProps,
}: {
  asset: CollectionAssetPreview;
  detail?: boolean;
  /** Draw on a card's tinted stage: transparent demos, inset windows and screenshots. */
  stage?: boolean;
  /** On a stage, frame small content larger. */
  zoom?: boolean;
  /** Render live demos in this theme instead of the page's. */
  theme?: 'light' | 'dark';
  /** Live props for a customisable demo (see shared/demo-props.ts). */
  demoProps?: DemoPropValues;
}) {
  const [failedUrl, setFailedUrl] = useState('');
  const live = asset.kind === 'component' && Object.hasOwn(demos, asset.id);
  const reviewed = reviewedPreviewPath(asset);
  const embedUrl = officialEmbedUrl(asset);
  const imageUrl = asset.preview?.kind === 'image' ? safeAssetUrl(asset.preview.url) : undefined;
  const showImage = imageUrl && failedUrl !== imageUrl;
  const livePreview = live || Boolean(reviewed) || Boolean(embedUrl);
  // The frame loads in the page theme; a stage background that needs another theme is
  // sent as a message, so switching it never reloads the demo.
  const theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  const clear = (stage ? '&stage=clear' : '') + (demoProps ? '&props=live' : '');

  return (
    <div
      className={`${stage ? 'g-preview' : 'asset-library-preview'} ${
        asset.kind === 'icon' ? 'is-icon' : ''
      } ${livePreview ? 'is-live-component' : ''} ${
        asset.kind === 'icon-pack' ? 'is-icon-pack' : ''
      } ${!livePreview && showImage && asset.kind === 'component' ? 'is-component-capture' : ''}`}
    >
      {asset.kind === 'icon-pack' ? (
        <div className="asset-library-no-preview">
          <strong>{asset.name}</strong>
          <span>Explore the complete library</span>
          <a href={assetDestinationUrl(asset)} target="_blank" rel="noopener noreferrer">
            Browse icon pack ↗
          </a>
        </div>
      ) : live ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          stage={stage}
          zoom={zoom}
          theme={themeOverride}
          demoProps={demoProps}
          src={`/live-demos/index.html?id=${encodeURIComponent(asset.id)}&theme=${theme}${clear}`}
          fallbackImageUrl={imageUrl}
        />
      ) : reviewed ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          stage={stage}
          zoom={zoom}
          theme={themeOverride}
          src={`${reviewed}&theme=${theme}${clear}`}
          fallbackImageUrl={imageUrl}
        />
      ) : embedUrl ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          src={embedUrl}
          external
          stage={stage}
          framed={stage}
          fallbackImageUrl={imageUrl}
        />
      ) : showImage ? (
        <img
          className={stage ? 'g-shot' : undefined}
          src={imageUrl}
          loading="lazy"
          alt={
            asset.kind === 'component'
              ? `${asset.name} captured component preview`
              : `${asset.name} original preview`
          }
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <PreviewUnavailable asset={asset} />
      )}
      {!livePreview &&
        (stage ? (
          showImage && (
            <small className="g-live" data-kind="capture">
              Screenshot
            </small>
          )
        ) : (
          <small>
            {asset.kind === 'icon-pack'
              ? 'Icon pack · Official source'
              : showImage
                ? 'Screenshot'
                : 'Source only'}
          </small>
        ))}
    </div>
  );
}
