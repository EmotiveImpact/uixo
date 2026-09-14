export type SemanticPreviewFamily =
  | 'button'
  | 'code'
  | 'device'
  | 'dialog'
  | 'effect'
  | 'layout'
  | 'list'
  | 'media'
  | 'navigation'
  | 'number'
  | 'pattern'
  | 'text';

const matches = (slug: string, pattern: RegExp) => pattern.test(slug);

/** Keep the illustration tied to what the component does, rather than its provider. */
export function semanticPreviewFamily(slug: string): SemanticPreviewFamily {
  if (matches(slug, /android|iphone|safari/)) return 'device';
  if (matches(slug, /code-comparison|script-copy|terminal|file-tree/)) return 'code';
  if (matches(slug, /button|theme-toggler/)) return 'button';
  if (matches(slug, /dialog|popover|disclosure|accordion|transition-panel/)) return 'dialog';
  if (matches(slug, /number|progress|ticker/)) return 'number';
  if (matches(slug, /text|word-rotate|typing|highlighter|box-reveal/)) return 'text';
  if (matches(slug, /grid|pattern|particles|meteors|ripple|background|globe|orbit|glyph/))
    return 'pattern';
  if (matches(slug, /carousel|image-comparison|video|pixel-image|lens/)) return 'media';
  if (matches(slug, /dock|toolbar|cursor|pointer|magnetic|spotlight|tilt/)) return 'navigation';
  if (matches(slug, /list|timeline|tweet|avatar/)) return 'list';
  if (matches(slug, /card|border|beam|blur|shine|glow|marquee|confetti|cool-mode/)) return 'effect';
  return 'layout';
}
