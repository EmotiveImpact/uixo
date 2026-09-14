import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

afterEach(cleanup);

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
    const websites = navigation.querySelector('a[href="/browse"]');
    const assets = navigation.querySelector('a[href="/browse/assets"]');
    const collections = navigation.querySelector('a[href="/collections"]');

    expect(websites?.textContent).toBe('Websites');
    expect(assets?.textContent).toBe('Assets');
    expect(collections?.textContent).toBe('Collections');

    fireEvent.click(assets!);
    expect(onAssets).toHaveBeenCalledOnce();
  });
});
