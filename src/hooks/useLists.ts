import { useCallback } from 'react';
import { api } from '../lib/api';
import {
  clearListOwner,
  createList,
  defaultLists,
  deleteList,
  loadListOwner,
  loadLists,
  listsEqual,
  mergeLists,
  removeEverywhere,
  saveListOwner,
  saveLists,
  shouldMergeLocal,
  toggleInList,
} from '../lib/lists';
import { DEFAULT_LIST_ID } from '../types';
import type { List } from '../types';
import { useAccountSnapshot } from './useAccountSnapshot';

/** Browser lists for guests; revision-checked Neon snapshots for signed-in members. */
export function useLists(userId: string | null, ready: boolean) {
  const sync = useAccountSnapshot<List[]>({
    userId,
    ready,
    loadLocal: loadLists,
    saveLocal: (lists) => {
      saveLists(lists);
      return true;
    },
    emptyLocal: defaultLists,
    loadOwner: loadListOwner,
    saveOwner: saveListOwner,
    clearOwner: clearListOwner,
    shouldMergeLocal,
    merge: mergeLists,
    equal: listsEqual,
    readRemote: async () => {
      const result = await api.getLists();
      if (result.ok) {
        return {
          ok: true as const,
          data: { value: result.data.lists, revision: result.data.revision },
        };
      }
      return {
        ...result,
        data: result.data
          ? { value: result.data.lists, revision: result.data.revision }
          : undefined,
      };
    },
    writeRemote: async (lists, revision) => {
      const result = await api.putLists(lists, revision);
      if (result.ok) {
        return {
          ok: true as const,
          data: { value: result.data.lists, revision: result.data.revision },
        };
      }
      return {
        ...result,
        data: result.data
          ? { value: result.data.lists, revision: result.data.revision }
          : undefined,
      };
    },
  });
  const { change } = sync;

  const toggleSaved = useCallback(
    (resourceId: string) => {
      change((current) => {
        const savedSomewhere = current.some((entry) => entry.resourceIds.includes(resourceId));
        return savedSomewhere
          ? removeEverywhere(current, resourceId)
          : toggleInList(current, DEFAULT_LIST_ID, resourceId);
      });
    },
    [change],
  );

  const toggleIn = useCallback(
    (listId: string, resourceId: string) => {
      change((current) => toggleInList(current, listId, resourceId));
    },
    [change],
  );

  const create = useCallback(
    (name: string) => {
      change((current) => createList(current, name));
    },
    [change],
  );

  const remove = useCallback(
    (listId: string) => {
      change((current) => deleteList(current, listId));
    },
    [change],
  );

  return {
    lists: sync.value,
    toggleSaved,
    toggleIn,
    create,
    remove,
    syncStatus: sync.status,
    syncError: sync.error,
    retrySync: sync.retry,
  };
}
