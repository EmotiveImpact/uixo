import { useCallback, useEffect, useId } from 'react';
import { api } from '../lib/api';
import {
  assetSavesEqual,
  ASSET_SAVES_KEY,
  clearAssetSaveOwner,
  loadAssetSaveOwner,
  loadAssetSaves,
  mergeAssetSaves,
  normalizeAssetIds,
  parseSavedAssets,
  saveAssetSaveOwner,
  saveAssetSaves,
} from '../lib/asset-saves';
import { shouldMergeLocal } from '../lib/lists';
import { useAccountSnapshot } from './useAccountSnapshot';

const CHANGED = 'uixo:asset-saves-changed';
type ChangedDetail = { source: string; assetIds: string[] };

function snapshotMutation(before: string[], after: string[]) {
  const previous = new Set(before);
  const wanted = new Set(after);
  const removed = new Set(before.filter((id) => !wanted.has(id)));
  const added = after.filter((id) => !previous.has(id));
  return (current: string[]) => [
    ...current.filter((id) => !removed.has(id)),
    ...added.filter((id) => !current.includes(id)),
  ];
}

/** One typed asset-save state for cards, detail, sidebar, other tabs and the account. */
export function useAssetSaves(userId: string | null = null, ready = true) {
  const source = useId();
  const sync = useAccountSnapshot<string[]>({
    userId,
    ready,
    loadLocal: loadAssetSaves,
    saveLocal: saveAssetSaves,
    emptyLocal: () => [],
    loadOwner: loadAssetSaveOwner,
    saveOwner: saveAssetSaveOwner,
    clearOwner: clearAssetSaveOwner,
    shouldMergeLocal,
    merge: mergeAssetSaves,
    equal: assetSavesEqual,
    readRemote: async () => {
      const result = await api.getSavedAssets();
      if (result.ok) {
        return {
          ok: true as const,
          data: { value: result.data.assetIds, revision: result.data.revision },
        };
      }
      return {
        ...result,
        data: result.data
          ? { value: result.data.assetIds, revision: result.data.revision }
          : undefined,
      };
    },
    writeRemote: async (assetIds, revision) => {
      const result = await api.putSavedAssets(assetIds, revision);
      if (result.ok) {
        return {
          ok: true as const,
          data: { value: result.data.assetIds, revision: result.data.revision },
        };
      }
      return {
        ...result,
        data: result.data
          ? { value: result.data.assetIds, revision: result.data.revision }
          : undefined,
      };
    },
  });

  const { change } = sync;
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<ChangedDetail>).detail;
      if (!detail || detail.source === source) return;
      const next = normalizeAssetIds(detail.assetIds);
      if (next) change(snapshotMutation(sync.value, next));
    };
    const storage = (event: StorageEvent) => {
      if (event.key === ASSET_SAVES_KEY || event.key === null) {
        const next = parseSavedAssets(localStorage.getItem(ASSET_SAVES_KEY));
        change(snapshotMutation(sync.value, next));
      }
    };
    window.addEventListener(CHANGED, changed);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(CHANGED, changed);
      window.removeEventListener('storage', storage);
    };
  }, [change, source, sync.value]);

  const save = useCallback(
    (assetIds: string[]) => {
      const next = normalizeAssetIds(assetIds);
      if (!next) return false;
      const persisted = change(snapshotMutation(sync.value, next));
      window.dispatchEvent(
        new CustomEvent<ChangedDetail>(CHANGED, {
          detail: { source, assetIds: next },
        }),
      );
      return persisted;
    },
    [change, source, sync.value],
  );

  return {
    saved: sync.value,
    save,
    syncStatus: sync.status,
    syncError: sync.error,
    retrySync: sync.retry,
    accountBacked: Boolean(userId),
  };
}
