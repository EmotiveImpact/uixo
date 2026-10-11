import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AssetDetail } from './AssetDetail';
import { EMPTY_ASSET_QUERY, readAssetQuery, assetHref } from '../lib/asset-library';
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('preserves utility routes when shared or reloaded', () => {
  for (const view of ['connect', 'guide', 'review', 'scout', 'jobs'] as const) {
    const query = { ...EMPTY_ASSET_QUERY, view };
    expect(readAssetQuery(new URL(assetHref(query), 'https://uixo.test').search)).toEqual(query);
  }
});
it('restores licence evidence, saving, automatic acquisition and compatibility in the shared detail', async () => {
  const asset = {
    id: 'lucide/activity',
    providerId: 'lucide',
    slug: 'activity',
    name: 'Activity',
    kind: 'icon',
    description: 'An activity icon',
    sourceUrl: 'https://github.com/lucide-icons/lucide',
    verifiedAt: '2026-09-12',
    preview: null,
    licence: {
      expression: 'MIT',
      commercial: 'allowed',
      redistribution: 'allowed',
      note: 'Keep attribution',
      sourceUrl: 'https://github.com/lucide-icons/lucide/LICENSE',
      text: 'Licence text',
    },
    evidence: [
      {
        field: 'Upstream SVG',
        url: 'https://github.com/lucide-icons/lucide/icons/activity.svg',
        method: 'inspected',
        observedAt: '2026-09-12',
        reference: 'abc123',
      },
    ],
    variants: [
      { id: 'svg', framework: 'agnostic', format: 'svg', dependencies: [], css: null },
      { id: 'react', framework: 'react', format: 'tsx', dependencies: ['lucide-react'], css: null },
    ],
  };
  const requests: { action: string; body?: { variantId?: string } }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const action = new URL(url, 'https://uixo.test').searchParams.get('action')!;
      const body = options?.body ? JSON.parse(String(options.body)) : undefined;
      requests.push({ action, body });
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () =>
          action === 'asset'
            ? asset
            : action === 'compatibility'
              ? {
                  status: 'requires-change',
                  reasons: ['Add dependencies'],
                  missingDependencies: ['lucide-react'],
                }
              : {
                  status: 'ready',
                  message: 'Review instruction',
                  url: asset.sourceUrl,
                  command: { executable: 'npm', arguments: ['install', body.variantId] },
                  executed: false,
                },
      };
    }),
  );
  const toggleSave = vi.fn();
  render(
    <AssetDetail
      id={asset.id}
      nameOf={() => 'Lucide'}
      query={{ ...EMPTY_ASSET_QUERY, framework: 'react' }}
      saved={false}
      toggleSave={toggleSave}
    />,
  );
  await screen.findByText('Licence & provenance');
  await screen.findByText('npm install react');
  expect(screen.getByRole('button', { name: 'Copy install command' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'View on Lucide' }).getAttribute('href')).toBe(
    asset.sourceUrl,
  );
  expect(screen.getByText('Redistribution')).toBeTruthy();
  expect(screen.getByText('Upstream SVG ↗')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(toggleSave).toHaveBeenCalledOnce();
  const variants = screen.getByRole('group', { name: 'Choose a variant' });
  expect(within(variants).getAllByRole('button')).toHaveLength(2);
  fireEvent.click(within(variants).getByRole('button', { name: /Framework agnostic · SVG/ }));
  await screen.findByText('npm install svg');
  fireEvent.click(screen.getByText('Check compatibility'));
  await screen.findByText('Dependencies to add: lucide-react');
  await waitFor(() =>
    expect(requests.some((r) => r.action === 'compatibility' && r.body?.variantId === 'svg')).toBe(
      true,
    ),
  );
});

it('offers Customise only for curated demos, and the code follows the chosen props', async () => {
  class Observer {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  const shimmer = {
    id: 'magic-ui/shimmer-button',
    providerId: 'magic-ui',
    slug: 'shimmer-button',
    name: 'Shimmer Button',
    kind: 'component',
    category: 'buttons',
    price: 'free',
    tags: [],
    description: 'A button with a shimmering light.',
    sourceUrl: 'https://github.com/magicuidesign/magicui',
    verifiedAt: '2026-09-14',
    preview: null,
    licence: {
      expression: 'MIT',
      commercial: 'allowed',
      redistribution: 'allowed',
      note: '',
      sourceUrl: 'https://github.com/magicuidesign/magicui/LICENSE.md',
    },
    variants: [
      {
        id: 'react',
        framework: 'react',
        format: 'tsx',
        css: 'tailwind',
        dependencies: [],
        acquisition: { kind: 'registry', url: 'https://magicui.design/r/shimmer-button.json' },
      },
    ],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const action = new URL(url, 'https://uixo.test').searchParams.get('action');
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () =>
          action === 'asset'
            ? shimmer
            : {
                status: 'ready',
                message: '',
                url: shimmer.sourceUrl,
                command: {
                  executable: 'npx',
                  arguments: ['shadcn', 'add', 'https://magicui.design/r/shimmer-button.json'],
                },
                executed: false,
              },
      };
    }),
  );
  render(
    <AssetDetail
      id={shimmer.id}
      nameOf={() => 'Magic UI'}
      query={EMPTY_ASSET_QUERY}
      saved={false}
      toggleSave={() => {}}
    />,
  );
  expect(await screen.findByRole('heading', { name: 'Customise' })).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'Choose a variant' })).toBeNull();
  // Sliders say what they change and in which unit.
  const duration = screen.getByRole('slider', { name: 'shimmerDuration, seconds' });
  expect(duration.getAttribute('aria-valuetext')).toMatch(/^[0-9.]+ seconds?$/);
  expect(screen.getByRole('slider', { name: 'borderRadius, pixels' })).toBeTruthy();
  expect(screen.getByRole('table')).toBeTruthy();
  await screen.findByText(/components\.json/);
  fireEvent.click(screen.getByRole('button', { name: 'shimmerColor #c4b5fd' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
  expect(screen.getByRole('tab', { name: 'Code' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByLabelText('Source of shimmer-button-demo.tsx').textContent).toContain(
    'shimmerColor="#c4b5fd"',
  );
});

it('turns a failed load into a way forward, with the technical reason behind Details', async () => {
  let calls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      calls += 1;
      return {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        json: async () => ({}),
      };
    }),
  );
  render(
    <AssetDetail
      id="magic-ui/shimmer-button"
      nameOf={() => 'Magic UI'}
      query={EMPTY_ASSET_QUERY}
      saved={false}
      toggleSave={() => {}}
    />,
  );
  expect(
    await screen.findByRole('heading', { level: 1, name: 'We could not load this component.' }),
  ).toBeTruthy();
  expect(screen.getByText('Your link is fine. Try again in a moment.')).toBeTruthy();
  expect(screen.getByRole('link', { name: /View on Magic UI/ }).getAttribute('href')).toMatch(
    /^https:\/\/magicui\.design\//,
  );
  expect(screen.getByRole('link', { name: 'Browse components' })).toBeTruthy();
  // The developer sentence is kept, but only behind the disclosure.
  const details = screen.getByText('Details').closest('details')!;
  expect(details.open).toBe(false);
  expect(within(details).getByText(/returned 500 without JSON/)).toBeTruthy();
  const visible = document.body.textContent!.replace(details.textContent!, '');
  expect(visible).not.toMatch(/registry|500|JSON/i);
  const before = calls;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(calls).toBeGreaterThan(before));
});
