export const SHADCN_PREVIEW_REF = '2b3e6d4f8d9161fe5c19340dc383aade392012dd';
export const SHADCN_PREVIEW_SHORT_REF = SHADCN_PREVIEW_REF.slice(0, 7);

const SHADCN_PREVIEWS = new Set(['alert', 'card', 'input', 'skeleton', 'spinner']);

export function pinnedComponentSource(providerId: string, slug: string): string | null {
  if (providerId !== 'shadcn' || !SHADCN_PREVIEWS.has(slug)) return null;
  return `https://github.com/shadcn-ui/ui/blob/${SHADCN_PREVIEW_REF}/apps/v4/registry/new-york-v4/ui/${slug}.tsx`;
}
