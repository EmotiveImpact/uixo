import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('../hooks/useRegistryData', () => ({ useRegistryData: () => ({ data: null }) }));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('LandingPage catalogue navigation', () => {
  it('uses the same Browse, Collections and For developers navigation as the application shell', () => {
    const onBrowse = vi.fn();
    const onAssets = vi.fn();
    const onCollections = vi.fn();

    render(
      <LandingPage
        authAvailable
        signedIn={false}
        hrefs={{
          browse: '/browse',
          assets: '/browse/assets',
          collections: '/collections',
          collection: (slug) => `/collections/${slug}`,
          resource: (id) => `/r/${id}`,
        }}
        onBrowse={onBrowse}
        onAssets={onAssets}
        onCollections={onCollections}
        onOpenCollection={vi.fn()}
        onOpenResource={vi.fn()}
        onSignIn={vi.fn()}
        onAbout={vi.fn()}
      />,
    );

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(navigation.querySelector('a[href="/collections"]')?.textContent).toBe('Collections');

    fireEvent.click(within(navigation).getByRole('button', { name: 'Browse' }));
    const menu = screen.getByRole('region', { name: 'Browse UIXO' });
    expect(menu.querySelector('a[href="/browse"]')).toBeTruthy();
    fireEvent.click(within(menu).getByRole('link', { name: 'Components' }));
    expect(window.location.pathname).toBe('/browse/assets');
  });
});
