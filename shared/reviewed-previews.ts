/** Deliberately finite: neither directory links nor database URLs approve executable previews. */
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
  preview: { kind: string; url?: string } | null;
}): string | undefined {
  if (asset.providerId !== 'kibo-ui' || asset.kind !== 'component') return undefined;
  const slug = asset.id.slice('kibo-ui/'.length);
  if (asset.id !== `kibo-ui/${slug}` || !Object.hasOwn(KIBO_REVIEWED_COMPONENTS, slug))
    return undefined;
  const path = `/provider-demos/kibo-ui/index.html?id=${slug}`;
  return asset.preview?.kind === 'embed' &&
    asset.preview.url === `https://uixo-brown.vercel.app${path}`
    ? path
    : undefined;
}
