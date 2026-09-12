import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  createList,
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

function scheduleWrite(
  timer: { current: ReturnType<typeof setTimeout> | null },
  userId: string | null,
  synced: boolean,
  next: List[],
) {
  if (!userId || !synced) return;
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => {
    void api.putLists(next).then((result) => {
      if (result.ok) saveListOwner(userId);
    });
  }, 300);
}

/**
 * Signed out, lists live in this browser. Signed in, they also live on the account:
 * first load merges guest/same-account cache with Neon, then every change is saved there.
 */
export function useLists(userId: string | null, ready: boolean) {
  const [lists, setLists] = useState<List[]>(loadLists);
  const synced = useRef(false);
  const userRef = useRef(userId);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = userId;
  }, [userId]);

  useEffect(() => {
    saveLists(lists);
  }, [lists]);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      synced.current = false;
      return;
    }

    let live = true;
    synced.current = false;

    void (async () => {
      // Sign-in sets the user before /token has a cookie to mint a JWT from.
      let remote = await api.getLists();
      for (let attempt = 0; !remote.ok && attempt < 4; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (!live) return;
        remote = await api.getLists();
      }
      if (!live) return;
      if (!remote.ok) {
        synced.current = true;
        return;
      }

      setLists((current) => {
        const next = shouldMergeLocal(loadListOwner(), userId)
          ? mergeLists(current, remote.data.lists)
          : mergeLists([], remote.data.lists);
        saveListOwner(userId);
        if (!listsEqual(next, remote.data.lists)) {
          void api.putLists(next);
        }
        return next;
      });
      if (live) synced.current = true;
    })();

    return () => {
      live = false;
    };
  }, [userId, ready]);

  const change = useCallback((update: (current: List[]) => List[]) => {
    setLists((current) => {
      const next = update(current);
      scheduleWrite(writeTimer, userRef.current, synced.current, next);
      return next;
    });
  }, []);

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

  return { lists, toggleSaved, toggleIn, create, remove };
}
