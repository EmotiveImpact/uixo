import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAssetWorkspacePath,
  navigateInApp,
  redirectLegacySaves,
  SAVED_WEBSITES_HREF,
} from './navigation';

describe('in-app workspace navigation', () => {
  beforeEach(() => window.history.replaceState(null, '', '/browse'));

  it('recognises the asset workspace with or without a trailing slash', () => {
    expect(isAssetWorkspacePath('/browse/assets')).toBe(true);
    expect(isAssetWorkspacePath('/browse/assets/')).toBe(true);
    expect(isAssetWorkspacePath('/browse')).toBe(false);
  });

  it('updates history and announces the route without reloading the document', () => {
    const onPopState = vi.fn();
    window.addEventListener('popstate', onPopState);

    navigateInApp('/browse/assets?view=saved');

    expect(window.location.pathname).toBe('/browse/assets');
    expect(window.location.search).toBe('?view=saved');
    expect(onPopState).toHaveBeenCalledOnce();
    window.removeEventListener('popstate', onPopState);
  });

  it('does not add or announce the current route again', () => {
    const onPopState = vi.fn();
    window.addEventListener('popstate', onPopState);

    navigateInApp('/browse');

    expect(onPopState).not.toHaveBeenCalled();
    window.removeEventListener('popstate', onPopState);
  });
});

describe('the old favourites list', () => {
  it('redirects to the Saved page websites tab without adding a history entry', () => {
    window.history.replaceState(null, '', '/list/favourites');
    const length = window.history.length;
    expect(redirectLegacySaves()).toBe(true);
    expect(window.location.pathname + window.location.search).toBe(SAVED_WEBSITES_HREF);
    expect(window.history.length).toBe(length);
    expect(redirectLegacySaves()).toBe(false);
  });
});
