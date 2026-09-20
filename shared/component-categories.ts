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
  return rules.find(([, pattern]) => pattern.test(slug))?.[0] ?? 'other';
}
