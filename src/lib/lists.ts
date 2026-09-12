import { DEFAULT_LIST_ID } from '../types';
import type { List } from '../types';
import {
  readStored,
  writeStored,
  LISTS_KEY,
  LISTS_OWNER_KEY,
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

export function loadListOwner(): string | null {
  const value = readStored<string | null>(LISTS_OWNER_KEY, null);
  return typeof value === 'string' && value.trim() ? value : null;
}

export function saveListOwner(userId: string): void {
  writeStored(LISTS_OWNER_KEY, userId);
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

const LIST_ID = /^[a-z0-9][a-z0-9-]*$/i;
const MAX_LISTS = 50;
const MAX_NAME = 80;
const MAX_ID = 64;
const MAX_SAVED = 500;

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

function withFavourites(lists: List[]): List[] {
  const favourites = lists.find((list) => list.id === DEFAULT_LIST_ID) ?? defaultLists()[0];
  return [favourites, ...lists.filter((list) => list.id !== DEFAULT_LIST_ID)];
}

/** Union two snapshots. Remote order wins; this browser’s extras are appended. */
export function mergeLists(local: List[], remote: List[]): List[] {
  const byId = new Map<string, List>();
  for (const list of remote) {
    byId.set(list.id, { ...list, resourceIds: uniqueIds(list.resourceIds) });
  }
  for (const list of local) {
    const existing = byId.get(list.id);
    if (!existing) {
      byId.set(list.id, { ...list, resourceIds: uniqueIds(list.resourceIds) });
      continue;
    }
    byId.set(list.id, {
      ...existing,
      resourceIds: uniqueIds([...existing.resourceIds, ...list.resourceIds]),
    });
  }
  return withFavourites([...byId.values()]);
}

/** Guest saves, or this account’s cache — never someone else’s leftovers on a shared browser. */
export function shouldMergeLocal(ownerId: string | null, userId: string): boolean {
  return ownerId === null || ownerId === userId;
}

export function listsEqual(left: List[], right: List[]): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (list, index) =>
      list.id === right[index].id &&
      list.name === right[index].name &&
      list.resourceIds.length === right[index].resourceIds.length &&
      list.resourceIds.every((id, at) => id === right[index].resourceIds[at]),
  );
}

/** Shape the API will accept. Null means the body is not a list snapshot. */
export function normalizeLists(input: unknown): List[] | null {
  if (!Array.isArray(input) || input.length > MAX_LISTS) return null;

  const seen = new Set<string>();
  const lists: List[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') return null;
    const raw = entry as { id?: unknown; name?: unknown; resourceIds?: unknown };
    if (
      typeof raw.id !== 'string' ||
      typeof raw.name !== 'string' ||
      !Array.isArray(raw.resourceIds)
    ) {
      return null;
    }
    const id = raw.id.trim();
    const name = id === DEFAULT_LIST_ID ? 'Favourites' : raw.name.trim();
    if (!id || id.length > MAX_ID || !LIST_ID.test(id) || seen.has(id)) return null;
    if (!name || name.length > MAX_NAME) return null;
    if (raw.resourceIds.length > MAX_SAVED) return null;

    const resourceIds: string[] = [];
    const saved = new Set<string>();
    for (const resourceId of raw.resourceIds) {
      if (typeof resourceId !== 'string') return null;
      const cleaned = resourceId.trim();
      if (!cleaned || cleaned.length > MAX_ID || !LIST_ID.test(cleaned)) return null;
      if (saved.has(cleaned)) continue;
      saved.add(cleaned);
      resourceIds.push(cleaned);
    }

    seen.add(id);
    lists.push({ id, name, resourceIds });
  }

  return withFavourites(lists);
}
