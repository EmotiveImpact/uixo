import { KIBO_REVIEWED_COMPONENTS } from './reviewed-previews.ts';

/** UIXO editorial taxonomy, independent of provider naming and package structure. */
export const COMPONENT_CATEGORIES = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'layout', label: 'Layout' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'data-display', label: 'Data display' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'text', label: 'Typography' },
  { id: 'backgrounds', label: 'Backgrounds' },
  { id: 'media', label: 'Media' },
  { id: 'motion', label: 'Motion' },
  { id: 'ai', label: 'AI & chat' },
  { id: 'other', label: 'Other' },
] as const;
export function componentCategory(slug: string, providerId = ''): string {
  if (providerId === 'kibo-ui' && Object.hasOwn(KIBO_REVIEWED_COMPONENTS, slug))
    return KIBO_REVIEWED_COMPONENTS[slug as keyof typeof KIBO_REVIEWED_COMPONENTS];
  if (['infinite-slider', 'progressive-blur'].includes(slug)) return 'layout';
  const rules: [string, RegExp][] = [
    ['buttons', /button|toggle|dock/],
    [
      'forms',
      /input|textarea|checkbox|radio|select|switch|slider|calendar|combobox|^form$|^field$|^label$/,
    ],
    ['navigation', /toolbar|navigation|breadcrumb|pagination|sidebar|menubar|tabs|scroll-progress/],
    [
      'overlays',
      /dialog|drawer|sheet|popover|tooltip|hover-card|context-menu|dropdown-menu|command/,
    ],
    ['feedback', /alert|toast|sonner|progress|spinner|skeleton|loading|empty|notification/],
    [
      'text',
      /text|word|scroll-based-velocity|highlighter|sliding-number|typewriter|typing|number-ticker|counting|hyper/,
    ],
    [
      'backgrounds',
      /background|striped-pattern|glyph-matrix|glow-effect|spotlight|grid-pattern|dot-pattern|particles|meteors|rain|sparkles|aurora|retro-grid|flickering|ripple|border-beam|shine-border|light-rays|confetti/,
    ],
    ['media', /icon-cloud|image|video|avatar|carousel|lens|zoom|safari|iphone|android|globe/],
    ['data-display', /table|chart|badge|tweet|code|file-tree|terminal|avatar-circles/],
    [
      'layout',
      /accordion|collapsible|card|bento|aspect-ratio|resizable|scroll-area|separator|^item$|marquee/,
    ],
    [
      'motion',
      /cool-mode|blur-fade|animated|morph|transition|spring|magnetic|tilt|in-view|cursor|pointer|trail|orbit|disclosure/,
    ],
  ];
  return (
    rules.find(([, pattern]) => pattern.test(slug))?.[0] ??
    LATER_RULES.find(([, pattern]) => pattern.test(slug))?.[0] ??
    'other'
  );
}

/**
 * A second pass for names the first rules leave in Other, mostly from the libraries added
 * in October 2026. It runs only after the first rules miss, so it never moves a component
 * the first rules already placed.
 */
const LATER_RULES: [string, RegExp][] = [
  ['data-display', /^widget-/],
  ['motion', /list-menu-animation|shape-shifter|hover-interaction/],
  [
    'ai',
    /^ai-|prompt|chain-of-thought|chat|conversation|^message|reasoning|^response|thinking-bar|^tool$|^source$|system-message|feedback-bar|jsx-preview|^markdown$|transcript|voice|^orb$|waveform|visualizer|audio-player|scrub-bar|^matrix$|speech-bubble/,
  ],
  [
    'forms',
    /autocomplete|color-(area|field|picker|swatch)|combo-box|date-?(field|picker|range)|fieldset|file-upload|floating-label|number-field|search-field|search-bar|time-field|tag-group|list-box|rating|halo-(field|search|segmented|dropzone)|attachment|poll|questionnaire|nlabel|clipboard|apple-keyboard/,
  ],
  ['overlays', /dropdown|modal|side-panel|floating-panel|lightbox/],
  [
    'navigation',
    /navbar|footer|mega-menu|smooth-tab|^link$|direction|sibling-focus-nav|speed-dial|flower-menu/,
  ],
  [
    'feedback',
    /banner|loader|preloader|meter|timer|onboarding|security-checkpoint|health|mana-bar|xp-bar|wizard|currency-transfer/,
  ],
  [
    'text',
    /blockquote|typography|kbd|heading|type-writer|rolling-number|marker|announcement-ribbon/,
  ],
  [
    'data-display',
    /^list|timeline|kanban|commit-graph|vote|voting|^widget-|chip|file-icons|^map$|heatmap|^hr$/,
  ],
  [
    'backgrounds',
    /bg-|fractal|circuit|glass|flow-field|grid-beam|dithering|liquid-metal|radial-gradient|guides|svg-bands|lightboard|bubbles|shape-hero|fibonacci|edge-blur/,
  ],
  [
    'media',
    /illustration|icon|apple-|mac-screen|dynamic-island|mock-browser|^s\d+$|squiggle|svg-shapes|^bubble$|fluid-ai/,
  ],
  [
    'layout',
    /expandable|sticky-section|stacked-sections|section-pricing|^hero-|marketing-hero|surface|scroll-shadow|^steps$|fluid/,
  ],
];
