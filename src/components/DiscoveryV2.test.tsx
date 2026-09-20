import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { CollectionAssetPreview, PublicCollection } from '../../shared/intelligence';
import { EMPTY_ASSET_QUERY, registryRequest } from '../lib/asset-library';
import { RegistryExplore } from './RegistryExplore';
import { CollectionGrid, FeaturedCollections } from './DiscoveryCollections';
import { SourceDirectory } from './SourceDirectory';

vi.mock('./motion/animated-sidebar', () => {
  const Group = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    AnimatedSidebarGroup: Group,
    AnimatedSidebarGroupLabel: Group,
    AnimatedSidebarGroupContent: Group,
    AnimatedSidebarMenu: Group,
    AnimatedSidebarMenuItem: Group,
    AnimatedSidebarMenuButton: ({
      children,
      onSelect,
      'aria-label': label,
    }: {
      children: ReactNode;
      onSelect: () => void;
      'aria-label'?: string;
    }) => (
      <button aria-label={label} onClick={onSelect}>
        {children}
      </button>
    ),
  };
});
vi.mock('./AssetPreview', () => ({
  AssetPreview: ({ asset }: { asset: CollectionAssetPreview }) => (
    <div data-testid="original-preview">{asset.id}</div>
  ),
}));
vi.mock('../lib/asset-library', async (original) => ({
  ...(await original<typeof import('../lib/asset-library')>()),
  registryRequest: vi.fn(),
}));
const request = vi.mocked(registryRequest);
const collection: PublicCollection = {
  slug: 'dashboard-foundations',
  title: 'Dashboard foundations',
  description: 'A focused selection for workspace navigation and data.',
  revision: 2,
  unavailableItems: 0,
  items: [
    {
      kind: 'asset',
      targetId: 'shadcn/sidebar',
      name: 'Sidebar',
      sourceUrl: 'https://ui.shadcn.com/docs/components/sidebar',
      note: 'Preserve the navigation context.',
      providerId: 'shadcn',
      providerName: 'shadcn/ui',
      frameworks: ['react'],
      licenceExpression: 'MIT',
      asset: {
        id: 'shadcn/sidebar',
        providerId: 'shadcn',
        name: 'Sidebar',
        kind: 'component',
        sourceUrl: 'https://ui.shadcn.com/docs/components/sidebar',
        preview: null,
      },
    },
  ],
};
function props() {
  return {
    query: { ...EMPTY_ASSET_QUERY },
    navigate: vi.fn(),
    isCurator: false,
    assetSaves: { saved: [], save: vi.fn(() => true), accountBacked: false },
  };
}
beforeEach(() => {
  request.mockReset();
});
afterEach(cleanup);

it('exposes public discovery and agent connection without exposing curator tools', () => {
  const choose = vi.fn();
  render(<RegistryExplore view="assets" onChoose={choose} />);
  for (const label of ['All assets', 'Asset collections', 'Sources', 'Connect your AI agent'])
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Operations' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Asset collections' }));
  expect(choose).toHaveBeenCalledWith('collections');
});

it('exposes all four operator workspaces only for an authorised curator', () => {
  const choose = vi.fn();
  render(<RegistryExplore view="operations" isCurator onChoose={choose} />);
  for (const label of ['Registry health', 'Operations', 'Editorial', 'Indexing'])
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Indexing' }));
  expect(choose).toHaveBeenCalledWith('jobs');
});

it('uses a real member asset as collection media and preserves source context', () => {
  const p = props();
  render(<CollectionGrid {...p} items={[collection]} />);
  expect(screen.getByTestId('original-preview').textContent).toBe('shadcn/sidebar');
  expect(screen.getByText('From shadcn/ui')).toBeTruthy();
  expect(screen.getByText('1 available items')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: 'Dashboard foundations' }));
  expect(p.navigate).toHaveBeenCalledWith(
    { view: 'collections', collection: 'dashboard-foundations' },
    true,
  );
});

it('does not manufacture a component thumbnail when no member preview is available', () => {
  const item = { ...collection.items[0], asset: undefined };
  render(<CollectionGrid {...props()} items={[{ ...collection, items: [item] }]} />);
  expect(screen.queryByTestId('original-preview')).toBeNull();
  expect(screen.getByText('No component preview is available for this selection.')).toBeTruthy();
});

it('keeps asset discovery usable when the optional featured-collection request fails', async () => {
  request.mockRejectedValue(new Error('Registry migration required.'));
  render(<FeaturedCollections {...props()} />);
  expect(
    await screen.findByText('Collections are unavailable. Asset browsing remains available below.'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry collections' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Connect your agent' })).toBeTruthy();
});

it('distinguishes an empty source directory from a service error', async () => {
  request.mockResolvedValue({ items: [] });
  render(<SourceDirectory {...props()} />);
  expect(await screen.findByText('No approved sources are available.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('requests the batched public source directory without an operator credential', async () => {
  request.mockResolvedValue({ items: [] });
  render(<SourceDirectory {...props()} />);
  await screen.findByText('No approved sources are available.');
  expect(request).toHaveBeenCalledWith(
    'source-directory',
    expect.objectContaining({ authenticated: false }),
  );
});
