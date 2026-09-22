import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('../hooks/useRegistryData', () => ({ useRegistryData: () => ({ data: null }) }));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('LandingPage catalogue navigation', () => {
  it('exposes the same three catalogue destinations as the application shell', () => {
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
    const resources = navigation.querySelector('a[href="/browse"]');
    const components = navigation.querySelector('a[href="/browse/assets"]');
    const collections = navigation.querySelector('a[href="/collections"]');

    expect(resources?.textContent).toBe('Websites');
    expect(components?.textContent).toBe('Assets');
    expect(collections?.textContent).toBe('Collections');

    fireEvent.click(components!);
    expect(window.location.pathname).toBe('/browse/assets');
  });
});
