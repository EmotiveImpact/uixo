import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAssetWorkspacePath, navigateInApp } from './navigation';

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
