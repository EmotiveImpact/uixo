import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRoute } from './useRoute';
import { EMPTY_ROUTE } from '../lib/url';

function go(path: string) {
  window.history.replaceState(null, '', path);
}

describe('useRoute', () => {
  beforeEach(() => go('/'));

  it('reads the initial route from the address bar', () => {
    go('/category/icons/outline?q=svg');
    const { result } = renderHook(() => useRoute());
    expect(result.current.route.category).toBe('Icons');
    expect(result.current.route.sub).toBe('Outline');
    expect(result.current.route.search).toBe('svg');
  });

  it('writes navigation to the URL', () => {
    go('/browse');
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ category: 'Icons' }));
    expect(window.location.pathname).toBe('/category/icons');
  });

  it('adds a history entry for navigation, so back works', () => {
    go('/browse');
    const { result } = renderHook(() => useRoute());
    const before = window.history.length;
    act(() => result.current.navigate({ category: 'Icons' }));
    expect(window.history.length).toBeGreaterThan(before);
  });

  it('replaces rather than stacks entries when only filters change', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ search: 'a' }));
    const after = window.history.length;
    act(() => result.current.navigate({ search: 'ab' }));
    act(() => result.current.navigate({ search: 'abc' }));
    expect(window.history.length).toBe(after);
  });

  it('re-reads the URL on popstate', () => {
    const { result } = renderHook(() => useRoute());
    go('/collections/motion-and-depth');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.route.collectionSlug).toBe('motion-and-depth');
  });

  it('flags an unknown path as not found', () => {
    go('/r/nope');
    const { result } = renderHook(() => useRoute());
    expect(result.current.route.notFound).toBe(true);
  });

  it('accepts a function updater', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate((current) => ({ ...current, category: 'Fonts' })));
    expect(result.current.route.category).toBe('Fonts');
  });
});

describe('leaving the landing page', () => {
  beforeEach(() => go('/'));

  it('starts on the landing page at the root', () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.route.landing).toBe(true);
  });

  it('leaves the landing page as soon as you navigate anywhere', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ category: 'Icons' }));
    expect(result.current.route.landing).toBe(false);
    expect(window.location.pathname).toBe('/category/icons');
  });

  it('leaves the landing page when a filter changes', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ search: 'icons' }));
    expect(window.location.pathname).toBe('/browse');
  });

  it('can be navigated back to explicitly', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ category: 'Icons' }));
    act(() => result.current.navigate({ ...EMPTY_ROUTE, landing: true }));
    expect(window.location.pathname).toBe('/');
  });
});
