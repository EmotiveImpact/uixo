/** Deliberately finite: neither directory links nor database URLs approve executable previews. */
export const KIBO_PREVIEW_REF = '3d63cdb15b79d972e3dc38a10997987672f9b263';

export const KIBO_REVIEWED_COMPONENTS = {
  announcement: 'feedback',
  banner: 'feedback',
  combobox: 'forms',
  'dialog-stack': 'overlays',
  rating: 'forms',
  'relative-time': 'data-display',
  status: 'feedback',
  tags: 'forms',
  'theme-switcher': 'forms',
  tree: 'data-display',
} as const;

export function reviewedPreviewPath(asset: {
  id: string;
  providerId: string;
  kind: string;
  sourceUrl: string;
  variants?: readonly { sourceRef?: string | null }[];
  preview: { kind: string; url?: string } | null;
}): string | undefined {
  if (asset.providerId !== 'kibo-ui' || asset.kind !== 'component') return undefined;
  const slug = asset.id.slice('kibo-ui/'.length);
  if (asset.id !== `kibo-ui/${slug}` || !Object.hasOwn(KIBO_REVIEWED_COMPONENTS, slug))
    return undefined;
  // Condensed collection records retain sourceUrl; full records also carry variants.
  // An unchanged ID must never make a newer or unrelated source look like this pinned demo.
  if (
    asset.sourceUrl !==
      `https://github.com/shadcnblocks/kibo/blob/${KIBO_PREVIEW_REF}/packages/${slug}/index.tsx` ||
    (asset.variants &&
      (!asset.variants.length ||
        asset.variants.some((variant) => variant.sourceRef !== KIBO_PREVIEW_REF)))
  )
    return undefined;
  const path = `/provider-demos/kibo-ui/index.html?id=${slug}`;
  return asset.preview?.kind === 'embed' &&
    asset.preview.url === `https://uixo-brown.vercel.app${path}`
    ? path
    : undefined;
}
