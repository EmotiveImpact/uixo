import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ASSET_SAVES } from '../lib/asset-library';
import { useAssetSaves } from './useAssetSaves';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
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
