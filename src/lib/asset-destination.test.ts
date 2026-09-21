import { describe, expect, it } from 'vitest';
import { assetDestinationUrl } from './asset-destination';

const asset = (overrides: Partial<Parameters<typeof assetDestinationUrl>[0]> = {}) => ({
  id: 'shadcn/calendar',
  providerId: 'shadcn',
  kind: 'component',
  name: 'Calendar',
  sourceUrl:
    'https://github.com/shadcn-ui/ui/blob/abc/apps/v4/registry/new-york-v4/ui/calendar.tsx',
  preview: null,
  ...overrides,
});

describe('assetDestinationUrl', () => {
  it('sends shadcn visitors to component documentation instead of registry JSON', () => {
    expect(
      assetDestinationUrl(asset(), 'https://ui.shadcn.com/r/styles/new-york-v4/calendar.json'),
    ).toBe('https://ui.shadcn.com/docs/components/calendar');
  });

  it('uses official component pages for the other registry providers', () => {
    expect(
      assetDestinationUrl(
        asset({
          id: 'magic-ui/animated-beam',
          providerId: 'magic-ui',
          name: 'Animated Beam',
          sourceUrl: 'https://github.com/magicuidesign/magicui/blob/abc/animated-beam.tsx',
        }),
        'https://magicui.design/r/animated-beam.json',
      ),
    ).toBe('https://magicui.design/docs/components/animated-beam');
    expect(
      assetDestinationUrl(
        asset({
          id: 'motion-primitives/accordion',
          providerId: 'motion-primitives',
          name: 'Accordion',
          sourceUrl: 'https://github.com/ibelick/motion-primitives/blob/abc/accordion.tsx',
        }),
        'https://motion-primitives.com/c/accordion.json',
      ),
    ).toBe('https://motion-primitives.com/docs/accordion');
  });

  it('uses the Kibo documentation route instead of its registry endpoint', () => {
    expect(
      assetDestinationUrl(
        asset({
          id: 'kibo-ui/announcement',
          providerId: 'kibo-ui',
          name: 'Announcement',
          sourceUrl:
            'https://github.com/shadcnblocks/kibo/blob/abc/packages/announcement/index.tsx',
        }),
        'https://www.kibo-ui.com/r/announcement.json',
      ),
    ).toBe('https://www.kibo-ui.com/components/announcement');
  });

  it('falls back to a repository or provider page rather than a code file', () => {
    expect(
      assetDestinationUrl(
        asset({
          id: 'unknown/widget',
          providerId: 'unknown',
          name: 'Widget',
          sourceUrl: 'https://github.com/example/components/blob/abc/widget.tsx',
        }),
        'https://raw.githubusercontent.com/example/components/abc/widget.tsx',
      ),
    ).toBe('https://github.com/example/components');
  });
});
