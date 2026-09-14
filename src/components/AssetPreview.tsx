import { useLayoutEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../lib/asset-library';
import { safeAssetUrl } from '../lib/asset-library';
import { PinnedComponentPreview } from './previews/PinnedComponentPreview';
import {
  pinnedComponentSource,
  SHADCN_PREVIEW_SHORT_REF,
} from './previews/pinned-component-sources';

/** Keep the reviewed source render as a fallback if a committed capture fails to load. */
function ComponentCanvas({ providerId, slug }: { providerId: string; slug: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () => {
      setScale(Math.min(element.clientWidth / 320, element.clientHeight / 200, 1.5));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={viewport} className="asset-preview-viewport">
      <div
        className="asset-preview-canvas"
        aria-hidden="true"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <PinnedComponentPreview providerId={providerId} slug={slug} />
      </div>
    </div>
  );
}

export function AssetPreview({ asset }: { asset: AssetRecord }) {
  const [failedUrl, setFailedUrl] = useState('');
  const remoteUrl = safeAssetUrl(asset.preview?.url);
  const capturedUrl =
    asset.kind === 'component' &&
    ['shadcn', 'magic-ui', 'motion-primitives'].includes(asset.providerId)
      ? `/assets/component-previews/${asset.providerId}/${asset.slug}.webp`
      : undefined;
  const imageUrl = capturedUrl ?? (asset.preview?.kind === 'image' ? remoteUrl : undefined);
  const showImage = imageUrl && failedUrl !== imageUrl;
  const pinnedSource =
    asset.kind === 'component' ? pinnedComponentSource(asset.providerId, asset.slug) : null;
  return (
    <div
      className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''} ${capturedUrl ? 'is-component-capture' : ''}`}
    >
      {showImage ? (
        <img
          src={imageUrl}
          loading="lazy"
          alt={`${asset.name} rendered preview from ${asset.providerId}`}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : pinnedSource ? (
        <ComponentCanvas providerId={asset.providerId} slug={asset.slug} />
      ) : (
        <div className="asset-library-no-preview">
          <span aria-hidden="true">◇</span>
          <strong>Official preview unavailable</strong>
        </div>
      )}
      <small title={pinnedSource ?? undefined}>
        {showImage
          ? capturedUrl
            ? 'Official provider demo capture'
            : 'Original GitHub SVG'
          : pinnedSource
            ? `Pinned source render · shadcn/ui ${SHADCN_PREVIEW_SHORT_REF}`
            : 'Source preview not captured'}
      </small>
    </div>
  );
}
