import { DEFAULT_LIST_ID } from '../types';
import type { List } from '../types';
import {
  readStored,
  writeStored,
  LISTS_KEY,
  LEGACY_COLLECTIONS_KEY,
  LEGACY_FAVOURITES_KEY,
} from './storage';

export function defaultLists(): List[] {
  return [{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: [] }];
}

/**
 * Collections replaced the old flat favourites list. Anyone who saved resources under
 * the previous version keeps them, folded into the default list.
 */
export function loadLists(): List[] {
  const stored = readStored<List[] | null>(LISTS_KEY, null);
  if (Array.isArray(stored) && stored.length) return stored;

  // These were called "collections" before the editorial ones took that name.
  const renamed = readStored<List[] | null>(LEGACY_COLLECTIONS_KEY, null);
  if (Array.isArray(renamed) && renamed.length) return renamed;

  const legacy = readStored<string[]>(LEGACY_FAVOURITES_KEY, []);
  const lists = defaultLists();
  if (Array.isArray(legacy) && legacy.length) lists[0].resourceIds = legacy;
  return lists;
}

export function saveLists(lists: List[]): void {
  writeStored(LISTS_KEY, lists);
}

export function isSavedAnywhere(lists: List[], resourceId: string): boolean {
  return lists.some((list) => list.resourceIds.includes(resourceId));
}

export function listsHolding(lists: List[], resourceId: string): string[] {
  return lists.filter((list) => list.resourceIds.includes(resourceId)).map((list) => list.id);
}

export function toggleInList(lists: List[], listId: string, resourceId: string): List[] {
  return lists.map((list) => {
    if (list.id !== listId) return list;
    const has = list.resourceIds.includes(resourceId);
    return {
      ...list,
      resourceIds: has
        ? list.resourceIds.filter((id) => id !== resourceId)
        : [...list.resourceIds, resourceId],
    };
  });
}

/** Removes a resource from every list — what the card's bookmark toggle does when unsaving. */
export function removeEverywhere(lists: List[], resourceId: string): List[] {
  return lists.map((list) => ({
    ...list,
    resourceIds: list.resourceIds.filter((id) => id !== resourceId),
  }));
}

export function createList(lists: List[], name: string): List[] {
  const trimmed = name.trim();
  if (!trimmed) return lists;
  const id = `c${Date.now().toString(36)}`;
  return [...lists, { id, name: trimmed, resourceIds: [] }];
}

export function deleteList(lists: List[], listId: string): List[] {
  if (listId === DEFAULT_LIST_ID) return lists;
  return lists.filter((list) => list.id !== listId);
}
