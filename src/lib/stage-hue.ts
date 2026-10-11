/**
 * Every card stage is lit in one hue. Well-known pieces get a hand-picked hue that suits
 * their own colours; everything else hashes its id into a palette of hues that stay
 * clean on both the dark ramp and the light pastel ramp (no olive or mustard).
 */
const COMPONENT_HUES: Record<string, number> = {
  'magic-ui/shimmer-button': 268,
  'magic-ui/aurora-text': 200,
  'magic-ui/retro-grid': 322,
  'motion-primitives/text-effect': 34,
  'shadcn/calendar': 156,
  'magic-ui/dock': 226,
  'magic-ui/animated-subscribe-button': 160,
  'magic-ui/rainbow-button': 300,
  'magic-ui/interactive-hover-button': 196,
  'magic-ui/pulsating-button': 246,
  'magic-ui/shiny-button': 280,
  'simply-buttons/arttech-download': 14,
  'magic-ui/terminal': 146,
  'magic-ui/animated-beam': 28,
  'magic-ui/hyper-text': 160,
  'magic-ui/word-rotate': 330,
  'magic-ui/number-ticker': 220,
  'magic-ui/typing-animation': 30,
  'magic-ui/dot-pattern': 205,
  'magic-ui/ripple': 262,
  'magic-ui/flickering-grid': 150,
  'magic-ui/grid-pattern': 40,
  'magic-ui/animated-grid-pattern': 190,
  'magic-ui/particles': 290,
  'magic-ui/meteors': 236,
  'magic-ui/globe': 210,
  'magic-ui/marquee': 252,
};

/** Hues that read as a lit colour, not a muddy one. 18 to 70 use the warm ramp. */
const PALETTE = [268, 200, 322, 156, 226, 296, 188, 246, 340, 168, 24, 212, 280, 36, 140, 310];

/** FNV-1a: small, stable across sessions and builds. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function stageHue(id: string): number {
  return COMPONENT_HUES[id] ?? PALETTE[stableHash(id) % PALETTE.length];
}

/** Warm hues go muddy at low lightness, so they get a brighter, more saturated ramp. */
export function isWarmHue(hue: number): boolean {
  return hue >= 18 && hue <= 70;
}

export type ProviderMark = { background: string; color?: string; glyph: string; slash?: boolean };

const PROVIDER_MARKS: Record<string, ProviderMark> = {
  'magic-ui': { background: 'linear-gradient(135deg,#c084fc,#ec4899)', glyph: 'M' },
  shadcn: { background: '#0a0a0a', glyph: '', slash: true },
  'motion-primitives': { background: 'linear-gradient(135deg,#52525b,#18181b)', glyph: 'mp' },
  animata: { background: 'linear-gradient(135deg,#fb923c,#ea580c)', glyph: 'A' },
  'simply-buttons': {
    background: 'linear-gradient(135deg,#fde047,#eab308)',
    color: '#1c1917',
    glyph: 'S',
  },
  'kibo-ui': { background: 'linear-gradient(135deg,#34d399,#059669)', glyph: 'K' },
  'heroui-web': { background: 'linear-gradient(135deg,#3b82f6,#0050c8)', glyph: 'H' },
  'flowbite-react': { background: 'linear-gradient(135deg,#60a5fa,#1c64f2)', glyph: 'F' },
  '8bitcn': { background: 'linear-gradient(135deg,#f87171,#b91c1c)', glyph: '8' },
  'cult-ui': { background: 'linear-gradient(135deg,#f472b6,#be185d)', glyph: 'C' },
  'kokonut-ui': { background: 'linear-gradient(135deg,#fbbf24,#d97706)', glyph: 'K' },
  neobrutalism: { background: '#88aaee', color: '#0a0a0a', glyph: 'N' },
  'elevenlabs-ui': { background: 'linear-gradient(135deg,#3f3f46,#0a0a0a)', glyph: 'E' },
  evilcharts: { background: 'linear-gradient(135deg,#ef4444,#7f1d1d)', glyph: 'E' },
  'prompt-kit': { background: 'linear-gradient(135deg,#818cf8,#4f46e5)', glyph: 'P' },
  mapcn: { background: 'linear-gradient(135deg,#38bdf8,#0369a1)', glyph: 'M' },
  heroicons: { background: 'linear-gradient(135deg,#a78bfa,#6d28d9)', glyph: 'H' },
  lucide: { background: 'linear-gradient(135deg,#fb7185,#e11d48)', glyph: 'L' },
  uixo: { background: 'linear-gradient(135deg,#a99dff,#5b4cf0)', glyph: 'U' },
};

const MARK_GRADIENTS = [
  ['#a78bfa', '#6d28d9'],
  ['#38bdf8', '#2563eb'],
  ['#fb923c', '#e11d48'],
  ['#34d399', '#059669'],
  ['#f472b6', '#be185d'],
  ['#818cf8', '#4338ca'],
  ['#2dd4bf', '#0f766e'],
  ['#fbbf24', '#d97706'],
];

/** A provider's mark: its curated colour, or a stable gradient from its name. */
export function providerMark(id: string, name = id): ProviderMark {
  const curated = PROVIDER_MARKS[id];
  if (curated) return curated;
  const [from, to] = MARK_GRADIENTS[stableHash(id) % MARK_GRADIENTS.length];
  const glyph =
    name
      .replace(/[^a-z0-9]/gi, '')
      .charAt(0)
      .toUpperCase() || '·';
  return { background: `linear-gradient(135deg,${from},${to})`, glyph };
}
