import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ASSET_SAVES } from '../lib/asset-library';
import { ASSET_SAVES_OWNER_KEY } from '../lib/asset-saves';
import { useAssetSaves } from './useAssetSaves';

const apiMock = vi.hoisted(() => ({
  getSavedAssets: vi.fn(),
  putSavedAssets: vi.fn(),
}));

vi.mock('../lib/api', () => ({ api: apiMock }));

beforeEach(() => {
  localStorage.clear();
  apiMock.getSavedAssets.mockReset();
  apiMock.putSavedAssets.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('keeps sidebar and card subscribers aligned when a save is added or removed', () => {
  const sidebar = renderHook(useAssetSaves);
  const cards = renderHook(useAssetSaves);
  act(() => {
    cards.result.current.save(['lucide/activity']);
  });
  expect(sidebar.result.current.saved).toEqual(['lucide/activity']);
  expect(JSON.parse(localStorage.getItem(ASSET_SAVES)!)).toEqual(['lucide/activity']);
  act(() => {
    cards.result.current.save([]);
  });
  expect(sidebar.result.current.saved).toEqual([]);
});
it('updates both subscribers when another browser tab changes saved assets', () => {
  const sidebar = renderHook(useAssetSaves);
  const cards = renderHook(useAssetSaves);
  act(() => {
    localStorage.setItem(ASSET_SAVES, JSON.stringify(['shadcn/button']));
    window.dispatchEvent(new StorageEvent('storage', { key: ASSET_SAVES }));
  });
  expect(sidebar.result.current.saved).toEqual(['shadcn/button']);
  expect(cards.result.current.saved).toEqual(['shadcn/button']);
});

it('migrates browser asset saves into the signed-in account', async () => {
  vi.useFakeTimers();
  localStorage.setItem(ASSET_SAVES, JSON.stringify(['lucide/activity']));
  apiMock.getSavedAssets.mockResolvedValue({
    ok: true,
    data: { assetIds: ['shadcn/button'], revision: 7 },
  });
  apiMock.putSavedAssets.mockResolvedValue({
    ok: true,
    data: { assetIds: ['shadcn/button', 'lucide/activity'], revision: 8 },
  });

  const hook = renderHook(() => useAssetSaves('user-a', true));
  await act(async () => vi.runAllTimersAsync());

  expect(apiMock.putSavedAssets).toHaveBeenCalledWith(['shadcn/button', 'lucide/activity'], 7);
  expect(hook.result.current.saved).toEqual(['shadcn/button', 'lucide/activity']);
  expect(localStorage.getItem(ASSET_SAVES_OWNER_KEY)).toBe(JSON.stringify('user-a'));
});

it('does not import asset saves cached for a different account', async () => {
  localStorage.setItem(ASSET_SAVES, JSON.stringify(['lucide/activity']));
  localStorage.setItem(ASSET_SAVES_OWNER_KEY, JSON.stringify('user-a'));
  apiMock.getSavedAssets.mockResolvedValue({
    ok: true,
    data: { assetIds: ['shadcn/button'], revision: 2 },
  });

  const hook = renderHook(() => useAssetSaves('user-b', true));
  await act(async () => Promise.resolve());

  expect(hook.result.current.saved).toEqual(['shadcn/button']);
  expect(apiMock.putSavedAssets).not.toHaveBeenCalled();
});

it('clears an account cache when that account signs out', async () => {
  localStorage.setItem(ASSET_SAVES, JSON.stringify(['lucide/activity']));
  localStorage.setItem(ASSET_SAVES_OWNER_KEY, JSON.stringify('user-a'));
  apiMock.getSavedAssets.mockResolvedValue({
    ok: true,
    data: { assetIds: ['lucide/activity'], revision: 2 },
  });

  const hook = renderHook(({ userId }) => useAssetSaves(userId, true), {
    initialProps: { userId: 'user-a' as string | null },
  });
  await act(async () => Promise.resolve());
  hook.rerender({ userId: null });
  await act(async () => Promise.resolve());

  expect(hook.result.current.saved).toEqual([]);
  expect(localStorage.getItem(ASSET_SAVES_OWNER_KEY)).toBeNull();
});

it('preserves an asset removal when another device updates the account first', async () => {
  vi.useFakeTimers();
  localStorage.setItem(ASSET_SAVES, JSON.stringify(['lucide/activity', 'shadcn/button']));
  localStorage.setItem(ASSET_SAVES_OWNER_KEY, JSON.stringify('user-a'));
  apiMock.getSavedAssets.mockResolvedValue({
    ok: true,
    data: { assetIds: ['lucide/activity', 'shadcn/button'], revision: 5 },
  });
  apiMock.putSavedAssets
    .mockResolvedValueOnce({
      ok: false,
      error: 'conflict',
      status: 409,
      data: {
        assetIds: ['lucide/activity', 'shadcn/button', 'radix/dropdown'],
        revision: 6,
      },
    })
    .mockResolvedValueOnce({
      ok: true,
      data: { assetIds: ['shadcn/button', 'radix/dropdown'], revision: 7 },
    });

  const hook = renderHook(() => useAssetSaves('user-a', true));
  await act(async () => Promise.resolve());
  act(() => hook.result.current.save(['shadcn/button']));
  await act(async () => vi.runAllTimersAsync());

  expect(apiMock.putSavedAssets).toHaveBeenNthCalledWith(1, ['shadcn/button'], 5);
  expect(apiMock.putSavedAssets).toHaveBeenNthCalledWith(2, ['shadcn/button', 'radix/dropdown'], 6);
  expect(hook.result.current.saved).toEqual(['shadcn/button', 'radix/dropdown']);
});
