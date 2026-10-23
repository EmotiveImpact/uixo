import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';
import { THEME_KEY } from '../lib/storage';

function mockPrefersLight(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('light') ? matches : !matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.unstubAllGlobals();
  });

  it('defaults to dark when nothing is stored', () => {
    mockPrefersLight(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.light).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('stays dark by default even when the system prefers light', () => {
    mockPrefersLight(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.light).toBe(false);
  });

  it('keeps a stored light choice', () => {
    mockPrefersLight(false);
    localStorage.setItem(THEME_KEY, JSON.stringify('light'));
    const { result } = renderHook(() => useTheme());
    expect(result.current.light).toBe(true);
  });

  it('persists the choice and mirrors it onto <html>', () => {
    mockPrefersLight(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());

    expect(result.current.light).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe(JSON.stringify('light'));
  });
});
