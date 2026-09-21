import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedSidebarProvider } from './motion/animated-sidebar';
import { AppSidebar } from './AppSidebar';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderSidebar(onAssets: boolean, curator = false) {
  render(
    <AnimatedSidebarProvider>
      <AppSidebar
        category={null}
        sub={null}
        listId={null}
        openSection={null}
        lists={[]}
        onShowAll={vi.fn()}
        homeHref="/browse"
        onChooseList={vi.fn()}
        onDeleteList={vi.fn()}
        onChooseCategory={vi.fn()}
        onChooseSub={vi.fn()}
        onSubmit={vi.fn()}
        onAssets={onAssets}
        registryCurator={curator}
        onChooseAssetView={vi.fn()}
        onChooseAssetKind={onAssets ? vi.fn() : undefined}
        onChooseAssetCategory={onAssets ? vi.fn() : undefined}
        assetProviders={
          onAssets
            ? [
                {
                  id: 'magic-ui',
                  name: 'Magic UI',
                  url: 'https://magicui.design/',
                  rationale: 'Component source',
                  assetCount: 68,
                  adapter: 'github-json-registry',
                },
                {
                  id: 'lucide',
                  name: 'Lucide',
                  url: 'https://lucide.dev/',
                  rationale: 'Icon source',
                  assetCount: 8,
                  adapter: 'github-icons',
                },
              ]
            : []
        }
      />
    </AnimatedSidebarProvider>,
  );
}

describe('AppSidebar catalogue context', () => {
  it('exposes Explore destinations without mixing source rows into asset categories', () => {
    renderSidebar(true);

    expect(screen.getByText('Asset types')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buttons' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forms' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Navigation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fonts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sources' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All assets' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Asset collections' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect your AI agent' })).toBeTruthy();
    expect(screen.queryByText('Magic UI')).toBeNull();
    expect(screen.queryByText('Lucide')).toBeNull();
    expect(screen.queryByText('All websites')).toBeNull();
    expect(screen.queryByText('Website categories')).toBeNull();
    expect(screen.queryByText('UI libraries')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Operations' })).toBeNull();
  });

  it('keeps website categories and makes asset discovery reachable from website pages', () => {
    renderSidebar(false);

    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('UI libraries')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All assets' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Asset collections' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sources' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registry health' })).toBeNull();
  });

  it('exposes operator workspaces to curator sessions without adding them for visitors', () => {
    renderSidebar(true, true);

    for (const name of ['Registry health', 'Operations', 'Editorial', 'Indexing']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });
});
