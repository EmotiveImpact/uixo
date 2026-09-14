import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetRecord } from '../lib/asset-library';
import { AssetPreview } from './AssetPreview';

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

function asset(overrides: Partial<AssetRecord>): AssetRecord {
  return {
    id: 'shadcn/alert',
    providerId: 'shadcn',
    slug: 'alert',
    name: 'Alert',
    description: 'Alert component',
    kind: 'component',
    price: 'free',
    tags: [],
    sourceUrl: 'https://github.com/shadcn-ui/ui',
    verifiedAt: '2026-09-14',
    preview: {
      kind: 'image',
      url: 'https://uixo-brown.vercel.app/assets/component-previews/shadcn/alert.webp',
      label: 'Official capture',
    },
    licence: {
      expression: 'MIT',
      commercial: 'allowed',
      redistribution: 'allowed',
      sourceUrl: 'https://github.com/shadcn-ui/ui/blob/main/LICENSE.md',
      note: '',
    },
    variants: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AssetPreview', () => {
  it('prefers a reviewed live component over its static capture', () => {
    const { container } = render(<AssetPreview asset={asset({})} />);

    expect(screen.getByTitle('Live Alert demo').getAttribute('sandbox')).toBe('allow-scripts');
    expect(screen.getByText(/^Live demo/)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.is-live-component')).toBeTruthy();
  });

  it('runs original provider components instead of screenshots', () => {
    const { container } = render(
      <AssetPreview
        asset={asset({
          id: 'magic-ui/marquee',
          providerId: 'magic-ui',
          slug: 'marquee',
          name: 'Marquee',
        })}
      />,
    );

    expect(screen.getByTitle('Live Marquee demo').getAttribute('src')).toContain(
      'magic-ui%2Fmarquee',
    );
    expect(container.querySelector('img')).toBeNull();
  });
});
