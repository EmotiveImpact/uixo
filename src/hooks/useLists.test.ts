import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LISTS_KEY, LISTS_OWNER_KEY } from '../lib/storage';
import { DEFAULT_LIST_ID } from '../types';
import { useLists } from './useLists';

const apiMock = vi.hoisted(() => ({
  getLists: vi.fn(),
  putLists: vi.fn(),
}));

vi.mock('../lib/api', () => ({ api: apiMock }));

const favourites = (resourceIds: string[]) => [
  { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds },
];

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  apiMock.getLists.mockReset();
  apiMock.putLists.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('account list reliability', () => {
  it('never writes a browser snapshot when the initial account read fails', async () => {
    apiMock.getLists.mockResolvedValue({ ok: false, error: 'offline', status: 0 });
    const hook = renderHook(() => useLists('user-a', true));

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(hook.result.current.syncStatus).toBe('error');

    act(() => hook.result.current.toggleSaved('lucide'));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(apiMock.putLists).not.toHaveBeenCalled();
    expect(hook.result.current.lists[0].resourceIds).toEqual(['lucide']);
  });

  it('migrates guest favourites after loading the remote revision', async () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(favourites(['lucide'])));
    apiMock.getLists.mockResolvedValue({
      ok: true,
      data: { lists: favourites(['orbkit']), revision: 3 },
    });
    apiMock.putLists.mockResolvedValue({
      ok: true,
      data: { lists: favourites(['orbkit', 'lucide']), revision: 4 },
    });

    const hook = renderHook(() => useLists('user-a', true));
    await act(async () => vi.runAllTimersAsync());

    expect(apiMock.putLists).toHaveBeenCalledWith(favourites(['orbkit', 'lucide']), 3);
    expect(hook.result.current.lists[0].resourceIds).toEqual(['orbkit', 'lucide']);
    expect(localStorage.getItem(LISTS_OWNER_KEY)).toBe(JSON.stringify('user-a'));
  });

  it('replays a removal over a concurrent account change before retrying', async () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(favourites(['lucide', 'orbkit'])));
    localStorage.setItem(LISTS_OWNER_KEY, JSON.stringify('user-a'));
    apiMock.getLists.mockResolvedValue({
      ok: true,
      data: { lists: favourites(['lucide', 'orbkit']), revision: 1 },
    });
    apiMock.putLists
      .mockResolvedValueOnce({
        ok: false,
        error: 'conflict',
        status: 409,
        data: { lists: favourites(['lucide', 'orbkit', 'ui8']), revision: 2 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { lists: favourites(['orbkit', 'ui8']), revision: 3 },
      });

    const hook = renderHook(() => useLists('user-a', true));
    await act(async () => Promise.resolve());
    act(() => hook.result.current.toggleSaved('lucide'));
    await act(async () => vi.runAllTimersAsync());

    expect(apiMock.putLists).toHaveBeenNthCalledWith(1, favourites(['orbkit']), 1);
    expect(apiMock.putLists).toHaveBeenNthCalledWith(2, favourites(['orbkit', 'ui8']), 2);
    expect(hook.result.current.lists[0].resourceIds).toEqual(['orbkit', 'ui8']);
    expect(hook.result.current.syncStatus).toBe('synced');
  });

  it('keeps a failed write pending and completes it after an explicit retry', async () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(favourites([])));
    localStorage.setItem(LISTS_OWNER_KEY, JSON.stringify('user-a'));
    apiMock.getLists.mockResolvedValue({
      ok: true,
      data: { lists: favourites([]), revision: 4 },
    });
    apiMock.putLists
      .mockResolvedValueOnce({ ok: false, error: 'offline', status: 0 })
      .mockResolvedValueOnce({
        ok: true,
        data: { lists: favourites(['lucide']), revision: 5 },
      });

    const hook = renderHook(() => useLists('user-a', true));
    await act(async () => Promise.resolve());
    act(() => hook.result.current.toggleSaved('lucide'));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(hook.result.current.syncStatus).toBe('error');
    expect(hook.result.current.syncError).toBe('offline');

    act(() => hook.result.current.retrySync());
    await act(async () => vi.runAllTimersAsync());

    expect(apiMock.putLists).toHaveBeenLastCalledWith(favourites(['lucide']), 4);
    expect(hook.result.current.lists[0].resourceIds).toEqual(['lucide']);
    expect(hook.result.current.syncStatus).toBe('synced');
  });
});
