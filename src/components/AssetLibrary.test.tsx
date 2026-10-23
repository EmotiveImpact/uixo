import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
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
  vi.unstubAllGlobals();
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

describe('Saved undo', () => {
  const record = {
    id: 'magic-ui/shimmer-button',
    providerId: 'magic-ui',
    slug: 'shimmer-button',
    name: 'Shimmer Button',
    description: '',
    kind: 'component',
    category: 'buttons',
    price: 'free',
    tags: [],
    sourceUrl: 'https://github.com/magicuidesign/magicui',
    verifiedAt: null,
    preview: null,
    licence: {
      expression: 'MIT',
      commercial: 'allowed',
      redistribution: 'allowed',
      sourceUrl: '',
      note: '',
    },
    variants: [],
  };

  function SavedPage({ onSave }: { onSave: (ids: string[]) => void }) {
    const [saved, setSaved] = useState([record.id]);
    return (
      <AssetLibrary
        query={{ ...EMPTY_ASSET_QUERY, view: 'saved' }}
        navigate={vi.fn()}
        density="comfortable"
        assetSaves={{
          saved,
          save: (ids) => {
            onSave(ids);
            setSaved(ids);
            return true;
          },
          accountBacked: false,
        }}
      />
    );
  }

  it('keeps an unsaved card in place with Undo for six seconds, then lets it go', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    request.mockImplementation(async (action, options) => {
      if (action !== 'search') throw new Error('not needed');
      const ids = options?.query?.saved ? options.query.saved.split(',') : [];
      const items = ids.includes(record.id) ? [record] : [];
      return { items, total: items.length, nextOffset: null } as never;
    });
    const onSave = vi.fn();
    render(<SavedPage onSave={onSave} />);
    const remove = await screen.findByRole('button', {
      name: 'Remove Shimmer Button from saved',
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(remove);
    expect(onSave).toHaveBeenLastCalledWith([]);
    // Still on the page, dimmed, with Undo; the removal is announced.
    expect(screen.getByText('Removed from saved.')).toBeTruthy();
    expect(screen.getByText('Removed Shimmer Button from saved.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onSave).toHaveBeenLastCalledWith([record.id]);
    expect(screen.queryByText('Removed from saved.')).toBeNull();
    expect(screen.getByRole('link', { name: /^Inspect Shimmer Button/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Shimmer Button from saved' }));
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /^Inspect Shimmer Button/ })).toBeNull(),
    );
    vi.useRealTimers();
  });

  it('says what saving did beside the Save button on a component page, with Undo after removal', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    request.mockImplementation(async (action) => {
      if (action === 'asset') return record as never;
      throw new Error('not needed');
    });
    function Detail() {
      const [saved, setSaved] = useState<string[]>([]);
      return (
        <AssetLibrary
          query={{ ...EMPTY_ASSET_QUERY, id: record.id }}
          navigate={vi.fn()}
          density="comfortable"
          assetSaves={{
            saved,
            save: (ids) => {
              setSaved(ids);
              return true;
            },
            accountBacked: false,
          }}
        />
      );
    }
    render(<Detail />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    const notice = document.querySelector('.ad-buy .ad-save-notice')!;
    expect(notice.textContent).toBe('Saved in this browser. Sign in to keep it on every device.');
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(document.querySelector('.ad-buy .ad-save-notice')!.textContent).toContain(
      'Removed Shimmer Button from saved.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Saved' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Spelling correction', () => {
  it('says which word it searched for and offers the typed one', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    request.mockImplementation(async (action, options) => {
      if (action !== 'search') throw new Error('not needed');
      expect(options?.query?.exact).toBeUndefined();
      return {
        items: [],
        total: 0,
        nextOffset: null,
        correction: {
          query: 'accordion',
          original: 'accordian',
          changes: [{ from: 'accordian', to: 'accordion' }],
        },
      } as never;
    });
    const navigate = vi.fn();
    render(
      <AssetLibrary
        query={{ ...EMPTY_ASSET_QUERY, q: 'accordian', kind: 'component' }}
        navigate={navigate}
        density="comfortable"
        assetSaves={assetSaves}
      />,
    );
    const instead = await screen.findByRole('button', { name: 'Search for “accordian” instead' });
    expect(instead.closest('p')!.textContent).toContain('Showing results for accordion.');
    fireEvent.click(instead);
    expect(navigate).toHaveBeenCalledWith({ exact: true, offset: 0 });
  });
});
