import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSidebarPreference } from './useSidebarPreference';
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('retains collapse when a different workspace mounts and restores the saved setting', () => {
  localStorage.setItem('uixo.sidebar.expanded', 'true');
  const first = renderHook(useSidebarPreference);
  act(() => first.result.current[1](false));
  expect(first.result.current[0]).toBe(false);
  first.unmount();
  const next = renderHook(useSidebarPreference);
  expect(next.result.current[0]).toBe(false);
  expect(localStorage.getItem('uixo.sidebar.expanded')).toBe('false');
  act(() => next.result.current[1](true));
  expect(next.result.current[0]).toBe(true);
});
it('shares changes across mounted shells and other tabs', () => {
  localStorage.setItem('uixo.sidebar.expanded', 'true');
  const first = renderHook(useSidebarPreference),
    second = renderHook(useSidebarPreference);
  act(() => first.result.current[1](false));
  expect(second.result.current[0]).toBe(false);
  act(() => {
    localStorage.setItem('uixo.sidebar.expanded', 'true');
    window.dispatchEvent(new StorageEvent('storage', { key: 'uixo.sidebar.expanded' }));
  });
  expect(first.result.current[0]).toBe(true);
  expect(second.result.current[0]).toBe(true);
});
