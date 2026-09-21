import demos from '../../live-demos/manifest.json';
import { safeAssetUrl } from './asset-library';

type AssetDestinationInput = {
  id: string;
  providerId: string;
  kind: string;
  name: string;
  sourceUrl: string;
  preview: { kind: 'image' | 'embed'; url?: string; label: string } | null;
};

const PROVIDER_HOMES: Record<string, string> = {
  shadcn: 'https://ui.shadcn.com/',
  lucide: 'https://lucide.dev/',
  heroicons: 'https://heroicons.com/',
  'magic-ui': 'https://magicui.design/',
  'motion-primitives': 'https://motion-primitives.com/',
  'simply-buttons': 'https://simply-buttons.vercel.app/',
  animata: 'https://animata.design/',
  'kibo-ui': 'https://www.kibo-ui.com/',
};

function assetSlug(asset: AssetDestinationInput): string {
  return asset.id.slice(asset.providerId.length + 1);
}

function isMachineSource(url: string): boolean {
  const parsed = new URL(url);
  return (
    parsed.hostname === 'raw.githubusercontent.com' ||
    parsed.pathname.includes('/blob/') ||
    parsed.pathname.includes('/raw/') ||
    /\.(?:css|js|jsx|json|svg|ts|tsx)$/i.test(parsed.pathname)
  );
}

function humanFallback(asset: AssetDestinationInput): string | undefined {
  const source = safeAssetUrl(asset.sourceUrl);
  if (source && !isMachineSource(source)) return source;
  if (source) {
    const parsed = new URL(source);
    const match = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\//.exec(parsed.pathname);
    if (parsed.hostname === 'github.com' && match)
      return `https://github.com/${match[1]}/${match[2]}`;
  }
  return PROVIDER_HOMES[asset.providerId];
}

/** A human-facing provider or documentation page, never an install registry or raw code file. */
export function assetDestinationUrl(
  asset: AssetDestinationInput,
  resolvedUrl?: string,
): string | undefined {
  const demo = demos[asset.id as keyof typeof demos];
  if (demo?.sourceUrl) return safeAssetUrl(demo.sourceUrl);

  const slug = assetSlug(asset);
  if (asset.providerId === 'kibo-ui')
    return safeAssetUrl(`https://www.kibo-ui.com/components/${encodeURIComponent(slug)}`);
  if (asset.providerId === 'simply-buttons')
    return safeAssetUrl(
      `https://simply-buttons.vercel.app/?q=${encodeURIComponent(asset.name)}#${encodeURIComponent(slug)}`,
    );
  if (asset.providerId === 'animata' && asset.preview?.kind === 'embed' && asset.preview.url) {
    const previewUrl = safeAssetUrl(asset.preview.url);
    if (previewUrl) {
      const preview = new URL(previewUrl);
      const storyId = preview.searchParams.get('id');
      if (preview.origin === 'https://animata.design' && storyId)
        return safeAssetUrl(
          `https://animata.design/preview/?path=/story/${encodeURIComponent(storyId)}`,
        );
    }
  }

  const resolved = safeAssetUrl(resolvedUrl);
  if (resolved && !isMachineSource(resolved)) return resolved;
  return humanFallback(asset);
}
