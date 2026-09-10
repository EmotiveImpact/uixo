import { beforeEach, describe, expect, it } from 'vitest';
import {
  listsHolding,
  createList,
  defaultLists,
  deleteList,
  isSavedAnywhere,
  loadLists,
  removeEverywhere,
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
