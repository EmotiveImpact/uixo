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

function renderSidebar(onAssets: boolean) {
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
        onChooseAssetKind={onAssets ? vi.fn() : undefined}
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
        onChooseAssetProvider={onAssets ? vi.fn() : undefined}
      />
    </AnimatedSidebarProvider>,
  );
}

describe('AppSidebar catalogue context', () => {
  it('shows asset types and indexed sources without website categories on asset pages', () => {
    renderSidebar(true);

    expect(screen.getByText('Asset types')).toBeTruthy();
    expect(screen.getByText('Sources')).toBeTruthy();
    expect(screen.getByText('Magic UI')).toBeTruthy();
    expect(screen.getByText('Lucide')).toBeTruthy();
    expect(screen.queryByText('All websites')).toBeNull();
    expect(screen.queryByText('All assets')).toBeNull();
    expect(screen.queryByText('Collections')).toBeNull();
    expect(screen.queryByText('Website categories')).toBeNull();
    expect(screen.queryByText('UI libraries')).toBeNull();
  });

  it('keeps the website category tree on website pages', () => {
    renderSidebar(false);

    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('UI libraries')).toBeTruthy();
    expect(screen.queryByText('All websites')).toBeNull();
    expect(screen.queryByText('All assets')).toBeNull();
    expect(screen.queryByText('Collections')).toBeNull();
    expect(screen.queryByText('Sources')).toBeNull();
  });
});
