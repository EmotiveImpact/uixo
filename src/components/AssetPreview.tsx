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
  const pinnedSource =
    asset.kind === 'component' ? pinnedComponentSource(asset.providerId, asset.slug) : null;
  const remoteUrl = safeAssetUrl(asset.preview?.url);
  const capturedUrl =
    asset.kind === 'component' &&
    ['shadcn', 'magic-ui', 'motion-primitives'].includes(asset.providerId)
      ? `/assets/component-previews/${asset.providerId}/${asset.slug}.webp`
      : undefined;
  // Reviewed local source is a real, theme-aware component. Captures remain the safe fallback
  // for providers whose runtime code has not yet been vendored and reviewed.
  const imageUrl = pinnedSource
    ? undefined
    : (capturedUrl ?? (asset.preview?.kind === 'image' ? remoteUrl : undefined));
  const showImage = imageUrl && failedUrl !== imageUrl;
  return (
    <div
      className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''} ${showImage && capturedUrl ? 'is-component-capture' : ''} ${pinnedSource ? 'is-live-component' : ''}`}
    >
      {pinnedSource ? (
        <ComponentCanvas providerId={asset.providerId} slug={asset.slug} />
      ) : showImage ? (
        <img
          src={imageUrl}
          loading="lazy"
          alt={`${asset.name} rendered preview from ${asset.providerId}`}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div className="asset-library-no-preview">
          <span aria-hidden="true">◇</span>
          <strong>Official preview unavailable</strong>
        </div>
      )}
      <small title={pinnedSource ?? undefined}>
        {pinnedSource
          ? `Live source preview · shadcn/ui ${SHADCN_PREVIEW_SHORT_REF}`
          : showImage
            ? capturedUrl
              ? 'Official provider demo capture'
              : 'Original GitHub SVG'
            : 'Source preview not captured'}
      </small>
    </div>
  );
}
