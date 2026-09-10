import { useCallback, useEffect, useState } from 'react';
import {
  createList,
  deleteList,
  loadLists,
  removeEverywhere,
  saveLists,
  toggleInList,
} from '../lib/lists';
import { DEFAULT_LIST_ID } from '../types';
import type { List } from '../types';

export function useLists() {
  const [lists, setCollections] = useState<List[]>(loadLists);

  useEffect(() => {
    saveLists(lists);
  }, [lists]);

  /** The card bookmark: saves to Favourites, or clears the resource from everywhere. */
  const toggleSaved = useCallback((resourceId: string) => {
    setCollections((current) => {
      const savedSomewhere = current.some((entry) => entry.resourceIds.includes(resourceId));
      return savedSomewhere
        ? removeEverywhere(current, resourceId)
        : toggleInList(current, DEFAULT_LIST_ID, resourceId);
    });
  }, []);

  const toggleIn = useCallback((listId: string, resourceId: string) => {
    setCollections((current) => toggleInList(current, listId, resourceId));
  }, []);

  const create = useCallback((name: string) => {
    setCollections((current) => createList(current, name));
  }, []);

  const remove = useCallback((listId: string) => {
    setCollections((current) => deleteList(current, listId));
  }, []);

  return { lists, toggleSaved, toggleIn, create, remove };
}
