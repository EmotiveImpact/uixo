import { thumbnailPosition } from '../data';
import withVariants from '../content/thumbnails.json';

type ThumbnailProps = {
  id: string;
  alt: string;
  /** Rendered width hint for the browser's source selection. */
  sizes: string;
  eager?: boolean;
  onError: () => void;
};

/** Ids that `npm run thumbnails` has generated WebP variants for. */
const HAS_WEBP = new Set(withVariants as string[]);

/**
 * WebP where it exists, PNG everywhere else. Explicit dimensions keep the grid from
 * reflowing as images arrive, and the crop anchor comes from the listing so the same
 * screenshot is framed identically on every surface.
 *
 * The <source> is conditional for a reason: a <picture> whose chosen <source> 404s does
 * NOT fall back to its <img>, it errors. Offering WebP for an id that has none would turn
 * every freshly-added listing into a blank tile until someone remembered to run the
 * generator.
 */
export function Thumbnail({ id, alt, sizes, eager, onError }: ThumbnailProps) {
  return (
    <picture style={{ '--thumb-pos': thumbnailPosition(id) } as React.CSSProperties}>
      {HAS_WEBP.has(id) && (
        <source
          type="image/webp"
          sizes={sizes}
          srcSet={`/assets/w/${id}-400.webp 400w, /assets/w/${id}-800.webp 800w`}
        />
      )}
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
