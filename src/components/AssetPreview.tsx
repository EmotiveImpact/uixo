import { reviewedPreviewPath } from '../../shared/reviewed-previews';
import { useEffect, useRef, useState } from 'react';
import type { CollectionAssetPreview } from '../../shared/intelligence';
import { assetHref, readAssetQuery, safeAssetUrl } from '../lib/asset-library';
import { assetDestinationUrl } from '../lib/asset-destination';
import { navigateInApp } from '../lib/navigation';
import demos from '../../live-demos/manifest.json';

type PreviewStatus = 'loading' | 'ready' | 'error';

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

function LivePreview({
  asset,
  detail,
  src,
  external = false,
  fallbackImageUrl,
}: {
  asset: CollectionAssetPreview;
  detail: boolean;
  src: string;
  external?: boolean;
  fallbackImageUrl?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(detail);
  const [size, setSize] = useState({ width: 480, height: 330 });
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );

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
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [asset.id, external]);

  useEffect(() => {
    if (!visible || status !== 'loading') return;
    const timeout = window.setTimeout(() => setStatus('error'), 20000);
    return () => window.clearTimeout(timeout);
  }, [visible, status]);

  const scale = detail ? 1 : size.width / 480;
  const showFallbackImage = status === 'error' && fallbackImageUrl && !fallbackFailed;

  return (
    <div
      ref={viewport}
      data-preview-state={status}
      className={`asset-live-viewport ${detail ? 'is-detail' : ''} ${
        showFallbackImage ? 'has-captured-fallback' : ''
      }`}
    >
      {visible && (
        <iframe
          ref={frame}
          title={`Live ${asset.name} demo`}
          src={src}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          style={{
            colorScheme: theme,
            visibility: status === 'ready' ? 'visible' : 'hidden',
            ...(detail
              ? {}
              : { width: 480, height: size.height / scale, transform: `scale(${scale})` }),
          }}
          onLoad={() => {
            setStatus('ready');
            if (!external)
              frame.current?.contentWindow?.postMessage({ type: 'uixo-preview-theme', theme }, '*');
          }}
        />
      )}
      {visible && status === 'loading' && (
        <span className="asset-live-loading" role="status">
          Loading live demo…
        </span>
      )}
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
        <a
          className="asset-live-fallback"
          href={assetDestinationUrl(asset)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open provider page ↗
        </a>
      )}
      <small className="actual-preview-label">
        {status === 'ready'
          ? 'Live · Try it'
          : showFallbackImage
            ? 'Screenshot · Live unavailable'
            : status === 'error'
              ? 'Preview unavailable'
              : 'Loading preview'}
      </small>
    </div>
  );
}

export function AssetPreview({
  asset,
  detail = false,
}: {
  asset: CollectionAssetPreview;
  detail?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState('');
  const live = asset.kind === 'component' && Object.hasOwn(demos, asset.id);
  const reviewed = reviewedPreviewPath(asset);
  const embedUrl = officialEmbedUrl(asset);
  const imageUrl = asset.preview?.kind === 'image' ? safeAssetUrl(asset.preview.url) : undefined;
  const showImage = imageUrl && failedUrl !== imageUrl;
  const livePreview = live || Boolean(reviewed) || Boolean(embedUrl);

  return (
    <div
      className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''} ${
        livePreview ? 'is-live-component' : ''
      } ${asset.kind === 'icon-pack' ? 'is-icon-pack' : ''} ${
        !livePreview && showImage && asset.kind === 'component' ? 'is-component-capture' : ''
      }`}
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
          src={`/live-demos/index.html?id=${encodeURIComponent(asset.id)}&theme=${
            document.documentElement.classList.contains('light') ? 'light' : 'dark'
          }`}
          fallbackImageUrl={imageUrl}
        />
      ) : reviewed ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          src={`${reviewed}&theme=${document.documentElement.classList.contains('light') ? 'light' : 'dark'}`}
          fallbackImageUrl={imageUrl}
        />
      ) : embedUrl ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          src={embedUrl}
          external
          fallbackImageUrl={imageUrl}
        />
      ) : showImage ? (
        <img
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
        <div className="asset-library-no-preview">
          <strong>Preview unavailable</strong>
          <a href={assetDestinationUrl(asset)} target="_blank" rel="noopener noreferrer">
            Open provider page ↗
          </a>
        </div>
      )}
      {!livePreview && (
        <small>
          {asset.kind === 'icon-pack'
            ? 'Icon pack · Official source'
            : showImage
              ? 'Screenshot'
              : 'Source only'}
        </small>
      )}
    </div>
  );
}
