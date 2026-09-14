import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../lib/asset-library';
import { safeAssetUrl } from '../lib/asset-library';
import demos from '../../live-demos/manifest.json';

function LivePreview({ asset, detail }: { asset: AssetRecord; detail: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(detail);
  const [size, setSize] = useState({ width: 480, height: 330 });
  const [status, setStatus] = useState('loading');
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );
  const [initialTheme] = useState(theme);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = new ResizeObserver(() =>
      setSize({ width: element.clientWidth || 480, height: element.clientHeight || 330 }),
    );
    resize.observe(element);
    const intersection = new IntersectionObserver(
      (entries) => setVisible(detail || entries[0].isIntersecting),
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
  }, [asset.id]);
  const scale = detail ? 1 : size.width / 480;
  const demo = demos[asset.id as keyof typeof demos];
  return (
    <div ref={viewport} className={`asset-live-viewport ${detail ? 'is-detail' : ''}`}>
      {visible && (
        <iframe
          ref={frame}
          title={`Live ${asset.name} demo`}
          src={`/live-demos/index.html?id=${encodeURIComponent(asset.id)}&theme=${initialTheme}`}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          style={
            detail
              ? undefined
              : { width: 480, height: size.height / scale, transform: `scale(${scale})` }
          }
          onLoad={() =>
            frame.current?.contentWindow?.postMessage({ type: 'uixo-preview-theme', theme }, '*')
          }
        />
      )}
      {status === 'error' && (
        <a
          className="asset-live-fallback"
          href={demo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original live demo ↗
        </a>
      )}
    </div>
  );
}

export function AssetPreview({ asset, detail = false }: { asset: AssetRecord; detail?: boolean }) {
  const [failedUrl, setFailedUrl] = useState('');
  const live = asset.kind === 'component' && Object.hasOwn(demos, asset.id);
  const imageUrl = asset.kind === 'icon' ? safeAssetUrl(asset.preview?.url) : undefined;
  const showImage = imageUrl && failedUrl !== imageUrl;
  return (
    <div
      className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''} ${live ? 'is-live-component' : ''}`}
    >
      {live ? (
        <LivePreview key={asset.id} asset={asset} detail={detail} />
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
        {live ? 'Live demo · Try it' : showImage ? 'Original GitHub SVG' : 'No live demo available'}
      </small>
    </div>
  );
}
