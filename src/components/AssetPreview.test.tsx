import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetRecord } from '../lib/asset-library';
import { KIBO_PREVIEW_REF } from '../../shared/reviewed-previews';
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
  window.history.replaceState(null, '', '/');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AssetPreview', () => {
  it('falls back to the captured render when live preview fails, and recovers on ready', () => {
    vi.useFakeTimers();
    render(<AssetPreview asset={asset({})} />);
    const frame = screen.getByTitle('Live Alert demo') as HTMLIFrameElement;
    expect(frame.style.visibility).toBe('hidden');
    expect(screen.getByRole('status').textContent).toContain('Loading live demo');
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByAltText('Alert captured component preview')).toBeTruthy();
    expect(frame.style.visibility).toBe('hidden');
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: frame.contentWindow,
          data: { type: 'uixo-preview-status', id: 'shadcn/alert', status: 'ready' },
        }),
      );
    });
    expect(frame.style.visibility).toBe('visible');
    expect(screen.queryByAltText('Alert captured component preview')).toBeNull();
    expect(screen.getByText('Live · Try it')).toBeTruthy();
  });

  it('prefers a reviewed live component over its static capture', () => {
    const { container } = render(<AssetPreview asset={asset({})} />);

    expect(screen.getByTitle('Live Alert demo').getAttribute('sandbox')).toBe('allow-scripts');
    expect(screen.getByText('Loading preview')).toBeTruthy();
    expect(screen.queryByText('Live · Try it')).toBeNull();
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

  it('embeds a verified provider Storybook demo instead of substituting an image', () => {
    const { container } = render(
      <AssetPreview
        asset={asset({
          id: 'animata/button-ripple-button',
          providerId: 'animata',
          slug: 'button-ripple-button',
          name: 'Ripple Button',
          preview: {
            kind: 'embed',
            url: 'https://animata.design/preview/iframe?id=button-ripple-button--primary&viewMode=story',
            label: 'Official Animata demo',
          },
        })}
      />,
    );

    const frame = screen.getByTitle('Live Ripple Button demo');
    expect(frame.getAttribute('src')).toContain('animata.design/preview/iframe');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(container.querySelector('img')).toBeNull();
  });
  it('uses only the exact reviewed Kibo preview and refuses replacement URLs', () => {
    const original = asset({
      id: 'kibo-ui/announcement',
      providerId: 'kibo-ui',
      slug: 'announcement',
      name: 'Announcement',
      sourceUrl: `https://github.com/shadcnblocks/kibo/blob/${KIBO_PREVIEW_REF}/packages/announcement/index.tsx`,
      variants: [
        {
          id: 'kibo-ui/announcement/react',
          framework: 'react',
          format: 'tsx',
          dependencies: [],
          css: 'tailwind',
          sourceRef: KIBO_PREVIEW_REF,
        },
      ],
      preview: {
        kind: 'embed',
        url: 'https://uixo-brown.vercel.app/provider-demos/kibo-ui/index.html?id=announcement',
        label: 'Original source',
      },
    });
    const { container, rerender } = render(<AssetPreview asset={original} />);
    expect(screen.getByTitle('Live Announcement demo').getAttribute('src')).toContain(
      '/provider-demos/kibo-ui/index.html?id=announcement',
    );
    expect(screen.getByTitle('Live Announcement demo').getAttribute('sandbox')).toBe(
      'allow-scripts',
    );
    expect(container.querySelector('img')).toBeNull();
    for (const sourceUrl of [
      original.sourceUrl.replace(KIBO_PREVIEW_REF, 'a'.repeat(40)),
      'https://unreviewed.example/source',
    ]) {
      rerender(<AssetPreview asset={{ ...original, sourceUrl }} />);
      expect(container.querySelector('iframe')).toBeNull();
    }
    rerender(
      <AssetPreview
        asset={{
          ...original,
          preview: { kind: 'embed', url: 'https://evil.example/demo', label: 'Not reviewed' },
        }}
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Preview unavailable')).toBeTruthy();
  });
});

describe('Screenshot fallback interactions', () => {
  it('opens the exact asset from its capture and preserves the current filters', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/browse/assets?category=forms&provider=shadcn');
    render(<AssetPreview asset={asset({})} />);
    act(() => vi.advanceTimersByTime(20000));
    const link = screen.getByRole('link', { name: 'Inspect Alert screenshot' });
    expect(link.getAttribute('href')).toContain('id=shadcn%2Falert');
    expect(screen.getByText('Screenshot · Live unavailable')).toBeTruthy();
    fireEvent.click(link);
    const query = new URLSearchParams(window.location.search);
    expect(query.get('id')).toBe('shadcn/alert');
    expect(query.get('provider')).toBe('shadcn');
    expect(query.get('category')).toBe('forms');
  });

  it('does not intercept modified screenshot links or claim a failed image is live', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/browse/assets');
    render(<AssetPreview asset={asset({})} />);
    act(() => vi.advanceTimersByTime(20000));
    fireEvent.click(screen.getByRole('link', { name: 'Inspect Alert screenshot' }), {
      ctrlKey: true,
    });
    expect(window.location.search).toBe('');
    fireEvent.error(screen.getByAltText('Alert captured component preview'));
    expect(screen.getByRole('link', { name: /Open original source/ })).toBeTruthy();
    expect(screen.queryByText('Live · Try it')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Inspect Alert screenshot' })).toBeNull();
  });

  it('shows the original source rather than an invented image when no capture exists', () => {
    vi.useFakeTimers();
    render(<AssetPreview asset={asset({ preview: null })} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Preview unavailable')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open original source/ })).toBeTruthy();
  });
});
