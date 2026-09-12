import { describe, expect, it } from 'vitest';
import { assetSavesEqual, mergeAssetSaves, normalizeAssetIds } from './asset-saves';

describe('typed asset saves', () => {
  it('normalizes valid registry ids and removes duplicates', () => {
    expect(normalizeAssetIds([' lucide/activity ', 'lucide/activity', 'shadcn/button'])).toEqual([
      'lucide/activity',
      'shadcn/button',
    ]);
  });

  it('rejects traversal, non-string values and oversized snapshots', () => {
    expect(normalizeAssetIds(['../secret'])).toBeNull();
    expect(normalizeAssetIds([42])).toBeNull();
    expect(normalizeAssetIds(Array.from({ length: 201 }, (_, i) => `asset/${i}`))).toBeNull();
  });

  it('merges remote order with guest additions and compares exact snapshots', () => {
    const merged = mergeAssetSaves(['lucide/activity'], ['shadcn/button']);
    expect(merged).toEqual(['shadcn/button', 'lucide/activity']);
    expect(assetSavesEqual(merged, ['shadcn/button', 'lucide/activity'])).toBe(true);
    expect(assetSavesEqual(merged, ['lucide/activity', 'shadcn/button'])).toBe(false);
  });
});
