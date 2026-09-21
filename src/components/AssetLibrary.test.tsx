import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ASSET_QUERY, registryRequest } from '../lib/asset-library';
import { AssetLibrary } from './AssetLibrary';

vi.mock('../lib/asset-library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/asset-library')>()),
  registryRequest: vi.fn(),
}));

const request = vi.mocked(registryRequest);
const assetSaves = {
  saved: [] as string[],
  save: vi.fn(() => true),
  accountBacked: false,
};

afterEach(() => {
  cleanup();
  request.mockReset();
});

describe('AssetLibrary toolbar', () => {
  it('does not show component categories for font assets', () => {
    request.mockRejectedValue(new Error('not needed for this render assertion'));
    render(
      <AssetLibrary
        query={{ ...EMPTY_ASSET_QUERY, kind: 'font' }}
        navigate={vi.fn()}
        density="comfortable"
        assetSaves={assetSaves}
      />,
    );

    expect(screen.queryByRole('group', { name: 'Component categories' })).toBeNull();
  });

  it('keeps component categories available for component assets', () => {
    request.mockRejectedValue(new Error('not needed for this render assertion'));
    render(
      <AssetLibrary
        query={{ ...EMPTY_ASSET_QUERY, kind: 'component' }}
        navigate={vi.fn()}
        density="comfortable"
        assetSaves={assetSaves}
      />,
    );

    expect(screen.getByRole('group', { name: 'Component categories' })).toBeTruthy();
  });
});
