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

/** Provider names and home pages, so a page can still point somewhere when the catalogue is down. */
const PROVIDERS: Record<string, { name: string; url: string }> = {
  shadcn: { name: 'shadcn/ui', url: 'https://ui.shadcn.com/' },
  lucide: { name: 'Lucide', url: 'https://lucide.dev/' },
  heroicons: { name: 'Heroicons', url: 'https://heroicons.com/' },
  'magic-ui': { name: 'Magic UI', url: 'https://magicui.design/' },
  'motion-primitives': { name: 'Motion Primitives', url: 'https://motion-primitives.com/' },
  'simply-buttons': { name: 'Simply Buttons', url: 'https://simply-buttons.vercel.app/' },
  animata: { name: 'Animata', url: 'https://animata.design/' },
  'kibo-ui': { name: 'Kibo UI', url: 'https://www.kibo-ui.com/' },
  'kokonut-ui': { name: 'Kokonut UI', url: 'https://kokonutui.com/' },
  evilcharts: { name: 'EvilCharts', url: 'https://evilcharts.com/' },
  '8bitcn': { name: '8bitcn/ui', url: 'https://8bitcn.com/' },
  'cult-ui': { name: 'Cult UI', url: 'https://cult-ui.com/' },
  neobrutalism: { name: 'Neobrutalism Components', url: 'https://neobrutalism.dev/' },
  'elevenlabs-ui': { name: 'ElevenLabs UI', url: 'https://ui.elevenlabs.io/' },
  'prompt-kit': { name: 'prompt-kit', url: 'https://www.prompt-kit.com/' },
  mapcn: { name: 'mapcn', url: 'https://mapcn.dev/' },
  'flowbite-react': { name: 'Flowbite React', url: 'https://flowbite-react.com/' },
  'heroui-web': { name: 'HeroUI Web', url: 'https://www.heroui.com/' },
};
const PROVIDER_HOMES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDERS).map(([id, provider]) => [id, provider.url]),
);

/**
 * The provider behind an asset id such as "magic-ui/shimmer-button", from the id alone:
 * its demo's own page when we know it, otherwise the provider's home page.
 */
export function providerPageFromId(id: string): { name: string; url: string } | null {
  const provider = PROVIDERS[id.split('/')[0]];
  if (!provider) return null;
  const demo = demos[id as keyof typeof demos] as { sourceUrl?: string } | undefined;
  return { name: provider.name, url: safeAssetUrl(demo?.sourceUrl) ?? provider.url };
}

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
