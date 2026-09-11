import { thumbnailPosition } from '../data';

type ThumbnailProps = {
  id: string;
  alt: string;
  /** Rendered width hint for the browser's source selection. */
  sizes: string;
  eager?: boolean;
  onError: () => void;
};

/**
 * WebP where supported, PNG everywhere else. Explicit dimensions keep the grid from
 * reflowing as images arrive, and the crop anchor comes from the listing so the same
 * screenshot is framed identically on every surface.
 */
export function Thumbnail({ id, alt, sizes, eager, onError }: ThumbnailProps) {
  return (
    <picture style={{ '--thumb-pos': thumbnailPosition(id) } as React.CSSProperties}>
      <source
        type="image/webp"
        sizes={sizes}
        srcSet={`/assets/w/${id}-400.webp 400w, /assets/w/${id}-800.webp 800w`}
      />
      <img
        src={`/assets/${id}.png`}
        alt={alt}
        width={1200}
        height={800}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={onError}
      />
    </picture>
  );
}
