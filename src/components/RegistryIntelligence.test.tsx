import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssetCollections } from './AssetCollections';
import { RegistryIntelligence } from './RegistryIntelligence';
import { RegistryOperations } from './RegistryOperations';
import {
  EMPTY_ASSET_QUERY,
  readAssetQuery,
  assetHref,
  registryRequest,
} from '../lib/asset-library';
import type { AssetQuery } from '../lib/asset-library';
import { useRegistryData } from '../hooks/useRegistryData';

vi.mock('../lib/asset-library', async (original) => ({
  ...(await original<typeof import('../lib/asset-library')>()),
  registryRequest: vi.fn(),
}));
const request = vi.mocked(registryRequest);
const collection = {
  slug: 'dashboard',
  title: 'Dashboard foundations',
  description: 'A considered selection.',
  revision: 1,
  publishedRevision: null,
  hasUnpublishedChanges: true,
  updatedAt: '2026-09-19T12:00:00Z',
  items: [
    {
      kind: 'asset',
      targetId: 'shadcn/card',
      name: 'Card',
      sourceUrl: 'https://ui.shadcn.com/',
      note: 'A clear container.',
    },
    {
      kind: 'provider',
      targetId: 'shadcn',
      name: 'shadcn/ui',
      sourceUrl: 'https://ui.shadcn.com/',
      note: 'Read the original guidance.',
    },
  ],
  unavailableItems: 0,
};
function props(changes: Partial<AssetQuery> = {}) {
  return {
    query: { ...EMPTY_ASSET_QUERY, ...changes },
    navigate: vi.fn(),
    isCurator: true,
    assetSaves: { saved: ['magic-ui/globe'], save: vi.fn(() => true), accountBacked: false },
  };
}
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (action) => {
    if (action === 'collection-editor' || action === 'collection')
      return structuredClone(collection);
    if (action === 'search') return { items: [], total: 0, nextOffset: null };
    if (action === 'providers') return { items: [] };
    return { items: [], total: 0, nextOffset: null };
  });
});
afterEach(cleanup);
it('preserves intelligence views and validates candidate/collection URL identifiers', () => {
  for (const view of [
    'health',
    'operations',
    'collections',
    'collection-editor',
    'sources',
  ] as const) {
    const q = {
      ...EMPTY_ASSET_QUERY,
      view,
      collection: 'dashboard',
      candidate: '11111111-2222-3333-4444-555555555555',
    };
    expect(readAssetQuery(new URL(assetHref(q), 'https://uixo.test').search)).toEqual(q);
  }
  expect(readAssetQuery('?collection=../../bad&candidate=not-a-uuid').collection).toBe('');
  expect(readAssetQuery('?collection=../../bad&candidate=not-a-uuid').candidate).toBe('');
});
it('distinguishes API failure from empty editorial inventory and supports retry', async () => {
  request.mockRejectedValueOnce(new Error('Registry migration required.'));
  render(<AssetCollections {...props({ view: 'collections' })} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('No asset collections are published yet.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText('No asset collections are published yet.')).toBeTruthy();
});
it('keeps provider membership typed and saves only available asset IDs', async () => {
  const p = props({ view: 'collections', collection: 'dashboard' });
  render(<AssetCollections {...p} />);
  await screen.findByRole('heading', { name: 'Dashboard foundations' });
  expect(screen.getByText('PROVIDER')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save available assets' }));
  expect(p.assetSaves.save).toHaveBeenCalledWith(['magic-ui/globe', 'shadcn/card']);
  expect(screen.getByText(/Assets saved in this browser/)).toBeTruthy();
});
it('requires saved edits before publishing and freezes the form during a save', async () => {
  const p = props({ view: 'collection-editor', collection: 'dashboard' });
  let finish: (value: unknown) => void = () => {};
  request.mockImplementation(async (action) => {
    if (action === 'collection-save')
      return new Promise((resolve) => {
        finish = resolve;
      });
    if (action === 'collection-editor') return structuredClone(collection);
    return { items: [], total: 0, nextOffset: null };
  });
  render(<AssetCollections {...p} />);
  const title = await screen.findByLabelText('Collection title');
  fireEvent.change(title, { target: { value: 'A better dashboard' } });
  fireEvent.change(screen.getByLabelText('Review reason'), {
    target: { value: 'Reviewed source and licence evidence.' },
  });
  const publish = screen.getByRole('button', {
    name: 'Publish reviewed version',
  }) as HTMLButtonElement;
  expect(publish.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(title.closest('fieldset')?.disabled).toBe(true);
  expect(request).toHaveBeenCalledWith(
    'collection-save',
    expect.objectContaining({
      authenticated: true,
      body: expect.objectContaining({ expectedRevision: 1, title: 'A better dashboard' }),
    }),
  );
  await act(async () => finish({ ...collection, title: 'A better dashboard', revision: 2 }));
  expect(title.closest('fieldset')?.disabled).toBe(false);
  expect(publish.disabled).toBe(false);
  expect(screen.getByText('Draft saved. The public version is unchanged.')).toBeTruthy();
});
it('retains the unsaved editor state when the server rejects a stale revision', async () => {
  request.mockImplementation(async (action) => {
    if (action === 'collection-save')
      throw new Error('The collection changed. Reload before saving.');
    if (action === 'collection-editor') return structuredClone(collection);
    return { items: [], total: 0, nextOffset: null };
  });
  render(<AssetCollections {...props({ view: 'collection-editor', collection: 'dashboard' })} />);
  const title = (await screen.findByLabelText('Collection title')) as HTMLInputElement;
  fireEvent.change(title, { target: { value: 'Keep this local edit' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByRole('alert');
  expect(title.value).toBe('Keep this local edit');
  expect(
    (screen.getByRole('button', { name: 'Publish reviewed version' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it('does not show curator navigation in the public source browser', async () => {
  render(<RegistryIntelligence {...props({ view: 'sources' })} isCurator={false} />);
  await screen.findByText('No approved sources are available.');
  expect(screen.queryByRole('link', { name: 'Operations' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Editorial' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Asset collections' })).toBeTruthy();
});
it('reports stages supplied by the registry without inventing published counts', async () => {
  request.mockResolvedValue({
    totals: { discovered: 1, investigating: 0, review: 0, published: 0, blocked: 0, rejected: 0 },
    total: 1,
    offset: 0,
    nextOffset: null,
    jobs: [],
    readOnly: false,
    items: [
      {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'New source',
        note: 'Needs investigation.',
        providerId: null,
        stage: 'discovered',
        pending: 0,
        live: 0,
      },
    ],
  });
  render(<RegistryOperations {...props({ view: 'operations' })} />);
  await screen.findByRole('link', { name: 'New source' });
  expect(screen.getByRole('button', { name: '0 Published' })).toBeTruthy();
  expect(screen.getByText(/Provider review required/)).toBeTruthy();
});
it('aborts stale requests and does not display a previous route response', async () => {
  const resolvers = new Map<string, (data: unknown) => void>();
  request.mockImplementation(
    async (action) => new Promise((resolve) => resolvers.set(action, resolve)),
  );
  function Probe({ action }: { action: string }) {
    const r = useRegistryData<{ label: string }>(action);
    return <div>{r.loading ? 'Loading new route' : r.data?.label}</div>;
  }
  const mounted = render(<Probe action="first" />);
  mounted.rerender(<Probe action="second" />);
  await act(async () => resolvers.get('first')!({ label: 'Stale first response' }));
  expect(screen.queryByText('Stale first response')).toBeNull();
  await act(async () => resolvers.get('second')!({ label: 'Correct second response' }));
  await waitFor(() => expect(screen.getByText('Correct second response')).toBeTruthy());
});
