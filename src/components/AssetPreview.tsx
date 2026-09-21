import { useEffect, useRef, useState } from 'react';
import type { CollectionAssetPreview } from '../../shared/intelligence';
import { safeAssetUrl } from '../lib/asset-library';
import demos from '../../live-demos/manifest.json';

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

  if (
    asset.providerId === 'tailark' &&
    parsed.origin === 'https://tailark.com' &&
    /^\/view\/(?:dusk|mist|veil)-[a-z0-9-]+-[a-z0-9-]+$/.test(parsed.pathname) &&
    !parsed.search
  )
    return url;

  return undefined;
}

function LivePreview({
  asset,
  detail,
  src,
  external = false,
}: {
  asset: CollectionAssetPreview;
  detail: boolean;
  src: string;
  external?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(detail);
  const [size, setSize] = useState({ width: 480, height: 330 });
  const [status, setStatus] = useState('loading');
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
      if (event.data.status === 'ready' || event.data.status === 'error')
        setStatus(event.data.status);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [asset.id, external]);
  useEffect(() => {
    if (!visible || status !== 'loading') return;
    // A failed entry script cannot post an error back to the parent.
    const timeout = window.setTimeout(() => setStatus('error'), 20000);
    return () => window.clearTimeout(timeout);
  }, [visible, status]);
  const scale = detail ? 1 : size.width / 480;
  const demo = demos[asset.id as keyof typeof demos];
  const fallbackUrl = demo?.sourceUrl ?? safeAssetUrl(asset.sourceUrl);
  return (
    <div ref={viewport} className={`asset-live-viewport ${detail ? 'is-detail' : ''}`}>
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
            if (external) setStatus('ready');
            else
              frame.current?.contentWindow?.postMessage({ type: 'uixo-preview-theme', theme }, '*');
          }}
        />
      )}
      {visible && status === 'loading' && (
        <span className="asset-live-loading" role="status">
          Loading live demo…
        </span>
      )}
      {status === 'error' && (
        <a
          className="asset-live-fallback"
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original live demo ↗
        </a>
      )}
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
  const embedUrl = officialEmbedUrl(asset);
  const livePreview = live || Boolean(embedUrl);
  const imageUrl = asset.kind === 'icon' ? safeAssetUrl(asset.preview?.url) : undefined;
  const showImage = imageUrl && failedUrl !== imageUrl;
  return (
    <div
      className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''} ${livePreview ? 'is-live-component' : ''} ${asset.kind === 'icon-pack' ? 'is-icon-pack' : ''}`}
    >
      {asset.kind === 'icon-pack' ? (
        <div className="asset-library-no-preview">
          <strong>{asset.name}</strong>
          <span>Explore the complete library</span>
          <a href={safeAssetUrl(asset.sourceUrl)} target="_blank" rel="noopener noreferrer">
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
        />
      ) : embedUrl ? (
        <LivePreview key={asset.id} asset={asset} detail={detail} src={embedUrl} external />
      ) : showImage ? (
        <img
          src={imageUrl}
          loading="lazy"
          alt={`${asset.name} original SVG`}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div className="asset-library-no-preview">
          <strong>Live preview unavailable</strong>
          <a href={safeAssetUrl(asset.sourceUrl)} target="_blank" rel="noopener noreferrer">
            Open original source ↗
          </a>
        </div>
      )}
      <small>
        {asset.kind === 'icon-pack'
          ? 'Icon library · Official source'
          : live || embedUrl
            ? 'Live demo · Try it'
            : showImage
              ? 'Original GitHub SVG'
              : 'No live demo available'}
      </small>
    </div>
  );
}
