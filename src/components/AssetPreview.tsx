import { reviewedPreviewPath } from '../../shared/reviewed-previews';
import { useEffect, useRef, useState } from 'react';
import type { CollectionAssetPreview } from '../../shared/intelligence';
import { safeAssetUrl } from '../lib/asset-library';
import demos from '../../live-demos/manifest.json';

type PreviewStatus = 'loading' | 'ready' | 'error';

function officialEmbedUrl(asset: CollectionAssetPreview): string | undefined {
  if (asset.providerId !== 'animata' || asset.preview?.kind !== 'embed') return undefined;
  const url = safeAssetUrl(asset.preview.url);
  if (!url) return undefined;
  const parsed = new URL(url);
  return parsed.origin === 'https://animata.design' && parsed.pathname === '/preview/iframe'
    ? url
    : undefined;
}

function LivePreview({
  asset,
  detail,
  src,
  external = false,
  onStatusChange,
}: {
  asset: CollectionAssetPreview;
  detail: boolean;
  src: string;
  external?: boolean;
  onStatusChange: (status: PreviewStatus) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(detail);
  const [size, setSize] = useState({ width: 480, height: 330 });
  const [status, setStatus] = useState<PreviewStatus>('loading');
  useEffect(() => onStatusChange(status), [status, onStatusChange]);
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
          href={safeAssetUrl(demo?.sourceUrl ?? asset.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original source ↗
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
  const [liveStatus, setLiveStatus] = useState<PreviewStatus>('loading');
  const live = asset.kind === 'component' && Object.hasOwn(demos, asset.id);
  const reviewed = reviewedPreviewPath(asset);
  const embedUrl = officialEmbedUrl(asset);
  const livePreview = live || Boolean(reviewed) || Boolean(embedUrl);
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
          onStatusChange={setLiveStatus}
          src={`/live-demos/index.html?id=${encodeURIComponent(asset.id)}&theme=${
            document.documentElement.classList.contains('light') ? 'light' : 'dark'
          }`}
        />
      ) : reviewed ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          onStatusChange={setLiveStatus}
          src={`${reviewed}&theme=${document.documentElement.classList.contains('light') ? 'light' : 'dark'}`}
        />
      ) : embedUrl ? (
        <LivePreview
          key={asset.id}
          asset={asset}
          detail={detail}
          onStatusChange={setLiveStatus}
          src={embedUrl}
          external
        />
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
          : live || reviewed || embedUrl
            ? liveStatus === 'error'
              ? 'Preview could not load'
              : liveStatus === 'ready'
                ? 'Live demo · Try it'
                : 'Loading original demo'
            : showImage
              ? 'Original GitHub SVG'
              : 'No live demo available'}
      </small>
    </div>
  );
}
