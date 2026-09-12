import { beforeEach, describe, expect, it } from 'vitest';
import {
  listsHolding,
  createList,
  defaultLists,
  deleteList,
  isSavedAnywhere,
  listsEqual,
  loadLists,
  mergeLists,
  normalizeLists,
  removeEverywhere,
  shouldMergeLocal,
  toggleInList,
} from './lists';
import { LISTS_KEY, LEGACY_FAVOURITES_KEY } from './storage';
import { DEFAULT_LIST_ID } from '../types';

describe('saving', () => {
  it('adds and removes a resource from one list', () => {
    let lists = defaultLists();
    lists = toggleInList(lists, DEFAULT_LIST_ID, 'lucide');
    expect(isSavedAnywhere(lists, 'lucide')).toBe(true);

    lists = toggleInList(lists, DEFAULT_LIST_ID, 'lucide');
    expect(isSavedAnywhere(lists, 'lucide')).toBe(false);
  });

  it('does not mutate the array it is given', () => {
    const lists = defaultLists();
    toggleInList(lists, DEFAULT_LIST_ID, 'lucide');
    expect(lists[0].resourceIds).toEqual([]);
  });

  it('reports every list holding a resource', () => {
    let lists = createList(defaultLists(), 'Motion');
    const motionId = lists[1].id;
    lists = toggleInList(lists, DEFAULT_LIST_ID, 'lucide');
    lists = toggleInList(lists, motionId, 'lucide');

    expect(listsHolding(lists, 'lucide')).toEqual([DEFAULT_LIST_ID, motionId]);
  });

  it('clears a resource out of every list at once', () => {
    let lists = createList(defaultLists(), 'Motion');
    lists = toggleInList(lists, DEFAULT_LIST_ID, 'lucide');
    lists = toggleInList(lists, lists[1].id, 'lucide');

    expect(listsHolding(removeEverywhere(lists, 'lucide'), 'lucide')).toEqual([]);
  });
});

describe('managing lists', () => {
  it('ignores blank names', () => {
    expect(createList(defaultLists(), '   ')).toHaveLength(1);
  });

  it('trims the name it stores', () => {
    expect(createList(defaultLists(), '  Motion  ')[1].name).toBe('Motion');
  });

  it('refuses to delete the default list', () => {
    expect(deleteList(defaultLists(), DEFAULT_LIST_ID)).toHaveLength(1);
  });

  it('deletes a user-made list', () => {
    const lists = createList(defaultLists(), 'Motion');
    expect(deleteList(lists, lists[1].id)).toHaveLength(1);
  });
});

describe('loading', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a single Favourites list', () => {
    expect(loadLists()).toEqual([{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: [] }]);
  });

  it('migrates favourites saved by the previous version', () => {
    localStorage.setItem(LEGACY_FAVOURITES_KEY, JSON.stringify(['lucide', 'orbkit']));
    expect(loadLists()[0].resourceIds).toEqual(['lucide', 'orbkit']);
  });

  it('prefers stored lists over the legacy key', () => {
    localStorage.setItem(LEGACY_FAVOURITES_KEY, JSON.stringify(['lucide']));
    localStorage.setItem(
      LISTS_KEY,
      JSON.stringify([{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['ui8'] }]),
    );
    expect(loadLists()[0].resourceIds).toEqual(['ui8']);
  });

  it('survives unparseable storage', () => {
    localStorage.setItem(LISTS_KEY, 'not json');
    expect(loadLists()).toHaveLength(1);
  });
});

describe('mergeLists', () => {
  it('unions Favourites from this browser and the account', () => {
    const local = [{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['lucide'] }];
    const remote = [{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['orbkit'] }];
    expect(mergeLists(local, remote)[0].resourceIds).toEqual(['orbkit', 'lucide']);
  });

  it('keeps a named list that only exists on one side', () => {
    const local = [
      { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: [] },
      { id: 'c1', name: 'Motion', resourceIds: ['orbkit'] },
    ];
    const remote = [
      { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['lucide'] },
      { id: 'c2', name: 'Portfolio', resourceIds: ['shadcn'] },
    ];
    const merged = mergeLists(local, remote);
    expect(merged.map((list) => list.id)).toEqual([DEFAULT_LIST_ID, 'c2', 'c1']);
    expect(merged.find((list) => list.id === 'c1')?.resourceIds).toEqual(['orbkit']);
    expect(merged.find((list) => list.id === 'c2')?.resourceIds).toEqual(['shadcn']);
  });

  it('always keeps a Favourites list', () => {
    expect(mergeLists([], [])).toEqual([
      { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: [] },
    ]);
  });
});

describe('shouldMergeLocal', () => {
  it('merges guest saves and the same account’s cache, not another person’s', () => {
    expect(shouldMergeLocal(null, 'user-a')).toBe(true);
    expect(shouldMergeLocal('user-a', 'user-a')).toBe(true);
    expect(shouldMergeLocal('user-a', 'user-b')).toBe(false);
  });
});

describe('normalizeLists', () => {
  it('accepts a well-formed snapshot and keeps Favourites first', () => {
    expect(
      normalizeLists([
        { id: 'c1', name: ' Motion ', resourceIds: ['orbkit', 'orbkit', 'lucide'] },
        { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['shadcn'] },
      ]),
    ).toEqual([
      { id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['shadcn'] },
      { id: 'c1', name: 'Motion', resourceIds: ['orbkit', 'lucide'] },
    ]);
  });

  it('rejects junk so a bad client cannot write it', () => {
    expect(normalizeLists(null)).toBeNull();
    expect(
      normalizeLists([{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['bad id'] }]),
    ).toBeNull();
    expect(normalizeLists([{ id: '', name: 'x', resourceIds: [] }])).toBeNull();
  });
});

describe('listsEqual', () => {
  it('is true only when ids, names and membership match in order', () => {
    const a = [{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: ['lucide'] }];
    expect(listsEqual(a, [{ ...a[0], resourceIds: ['lucide'] }])).toBe(true);
    expect(listsEqual(a, [{ ...a[0], resourceIds: ['orbkit'] }])).toBe(false);
  });
});
