import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_ASSET_QUERY, registryRequest } from '../lib/asset-library';
import { SourceDirectory } from './SourceDirectory';
import { RegistryIntelligence } from './RegistryIntelligence';
import type { SourceSummary } from '../../shared/source-directory';

vi.mock('../lib/asset-library', async (original) => ({
  ...(await original<typeof import('../lib/asset-library')>()),
  registryRequest: vi.fn(),
}));
const request = vi.mocked(registryRequest);
const source: SourceSummary = {
  id: 'large-source',
  name: 'Large source',
  url: 'https://example.test/',
  rationale: 'Source fixture.',
  assetCount: 10001,
  metrics: null,
  evidenceStatus: 'deferred',
  evidenceNote:
    'Detailed evidence was not calculated in this request. Inspect individual assets for their retained evidence.',
  frameworks: [],
  formats: [],
  licences: [],
  oldestVerifiedAt: null,
  newestVerifiedAt: null,
  upstreamStatus: 'not-checked',
};
const props = () => ({
  query: { ...EMPTY_ASSET_QUERY, view: 'sources' as const },
  navigate: vi.fn(),
  isCurator: false,
  assetSaves: { saved: [], save: vi.fn(() => true), accountBacked: false },
});
beforeEach(() => {
  request.mockReset();
});
afterEach(cleanup);

it('renders an exact large-source count without inventing zero evidence', async () => {
  request.mockResolvedValue({ items: [source], total: 1, nextOffset: null });
  render(<SourceDirectory {...props()} />);
  expect(await screen.findByText('10001')).toBeTruthy();
  expect(screen.getByText(source.evidenceNote!)).toBeTruthy();
  expect(screen.queryByText('0/10001')).toBeNull();
  expect(screen.getByRole('link', { name: 'Browse assets' })).toBeTruthy();
});

it('paginates on the server and retains search input while data reloads', async () => {
  request.mockResolvedValue({ items: [source], total: 13, nextOffset: 12 });
  const p = props();
  const rendered = render(<SourceDirectory {...p} />);
  await screen.findByText('10001');
  fireEvent.click(screen.getByRole('button', { name: 'Next sources' }));
  expect(p.navigate).toHaveBeenCalledWith({ offset: 12 });
  request.mockReturnValue(new Promise(() => {}));
  rendered.rerender(<SourceDirectory {...p} query={{ ...p.query, q: 'MIT', offset: 0 }} />);
  expect((screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement).value).toBe(
    'MIT',
  );
  expect(request).toHaveBeenLastCalledWith(
    'source-directory',
    expect.objectContaining({
      query: { q: 'MIT', offset: '0', limit: '12' },
      authenticated: false,
    }),
  );
});

it('starts a changed source search at page one', async () => {
  request.mockResolvedValue({ items: [source], total: 13, nextOffset: null });
  const p = props();
  render(<SourceDirectory {...p} query={{ ...p.query, offset: 12 }} />);
  await screen.findByText('10001');
  fireEvent.change(screen.getByRole('searchbox', { name: 'Find a source' }), {
    target: { value: 'React' },
  });
  expect(p.navigate).toHaveBeenCalledWith({ q: 'React', offset: 0 });
});

it('keeps service errors distinct from an empty source directory', async () => {
  request.mockRejectedValue(new Error('Source service unavailable.'));
  render(<SourceDirectory {...props()} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(screen.getByRole('searchbox', { name: 'Find a source' })).toBeTruthy();
  expect(screen.queryByText('No approved sources are available.')).toBeNull();
});

it('keeps a large source profile browsable and labels unassessed verification honestly', async () => {
  request.mockResolvedValue(source);
  const p = props();
  render(<RegistryIntelligence {...p} query={{ ...p.query, provider: source.id }} />);
  expect(await screen.findByRole('link', { name: 'Browse 10001 assets' })).toBeTruthy();
  expect(screen.getAllByText('Not assessed')).toHaveLength(2);
  expect(screen.getByText(source.evidenceNote!)).toBeTruthy();
  expect(screen.queryByText('Licence evidence')).toBeNull();
});
