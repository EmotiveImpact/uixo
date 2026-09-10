import { describe, expect, it } from 'vitest';
import { filterResources, populatedSubs, categoryCount, searchIndex } from './filters';
import { categories, resources, thumbnailPosition } from '../data';
import { ALL_FORMATS } from '../types';
import type { FilterState } from './filters';

const base: FilterState = {
  listIds: null,
  category: null,
  sub: null,
  price: 'All',
  format: ALL_FORMATS,
  browse: 'Featured',
  search: '',
};

const names = (state: Partial<FilterState>) =>
  filterResources(resources, { ...base, ...state }).map((resource) => resource.name);

describe('browse order', () => {
  it('hides non-featured resources on the unfiltered landing view', () => {
    expect(names({})).not.toContain('Built by Designers');
  });

  it('shows everything under Recent, newest first', () => {
    const recent = names({ browse: 'Recent' });
    expect(recent).toHaveLength(resources.length);
    expect(recent[0]).toBe('UI8');
    expect(recent.at(-1)).toBe('Orbkit');
  });

  it('stops hiding non-featured resources once a category is picked', () => {
    expect(names({ category: 'Inspiration' })).toContain('Built by Designers');
  });

  it('stops hiding non-featured resources inside a list', () => {
    expect(names({ listIds: ['built'] })).toEqual(['Built by Designers']);
  });
});

describe('pricing', () => {
  it('treats Free, Freemium and Paid as distinct', () => {
    expect(names({ price: 'Free', browse: 'Recent' })).toEqual([
      'Built by Designers',
      'Lucide',
      'shadcn/ui',
      'Orbkit',
    ]);
    expect(names({ price: 'Freemium', browse: 'Recent' })).toEqual([
      'UI8',
      'React Bits',
      'Grainient',
    ]);
  });

  it('never returns a freemium resource under a Free filter', () => {
    const free = filterResources(resources, { ...base, price: 'Free', browse: 'Recent' });
    expect(free.every((resource) => resource.pricing === 'Free')).toBe(true);
  });
});

describe('categories and subcategories', () => {
  it('matches a category via tags as well as the category field', () => {
    // UI8 is a Marketplace resource but is tagged Fonts.
    expect(names({ category: 'Fonts' })).toEqual(['UI8']);
  });

  it('narrows to a subcategory', () => {
    expect(names({ category: 'Components', sub: 'Animation' })).toEqual(['Orbkit', 'React Bits']);
  });

  it('reports only subcategories that would return something', () => {
    const components = categories.find((entry) => entry.name === 'Components')!;
    expect(populatedSubs(resources, components)).toEqual(['Animation']);
    expect(components.sub).toContain('Buttons');
  });

  it('counts resources per category consistently with filtering', () => {
    for (const category of categories) {
      expect(categoryCount(resources, category)).toBe(names({ category: category.name }).length);
    }
  });
});

describe('search', () => {
  it('matches names case-insensitively', () => {
    expect(names({ search: 'LUCIDE' })).toEqual(['Lucide']);
  });

  it('matches aliases the resource is not literally named', () => {
    expect(names({ search: 'feather' })).toEqual(['Lucide']);
    expect(names({ search: 'shad cn' })).toEqual(['shadcn/ui']);
  });

  it('requires every term to match, so extra words narrow', () => {
    expect(names({ search: 'react', browse: 'Recent' }).length).toBeGreaterThan(1);
    expect(names({ search: 'react shader', browse: 'Recent' })).toEqual(['Orbkit']);
  });

  it('matches use-case phrases from the description', () => {
    expect(names({ search: 'marketplace', browse: 'Recent' })).toContain('UI8');
  });

  it('ignores surrounding whitespace', () => {
    expect(names({ search: '   lucide  ' })).toEqual(['Lucide']);
  });

  it('indexes pricing so it is searchable', () => {
    expect(searchIndex(resources[0])).toContain('free');
  });
});

describe('formats and lists', () => {
  it('filters by format', () => {
    expect(names({ format: 'PNG', browse: 'Recent' })).toEqual(['Grainient']);
  });

  it('restricts to the ids in a list', () => {
    expect(names({ listIds: ['lucide', 'orbkit'], browse: 'Recent' })).toEqual([
      'Lucide',
      'Orbkit',
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(names({ listIds: [] })).toEqual([]);
  });

  it('combines filters conjunctively', () => {
    // shadcn/ui is a UI library but is tagged Components, and is free.
    expect(names({ category: 'Components', price: 'Free' })).toEqual(['Orbkit', 'shadcn/ui']);
  });
});

describe('thumbnail framing', () => {
  it('centres the listings whose screenshot subject sits mid-page', () => {
    for (const id of ['orbkit', 'grainient', 'shadcn', 'ui8']) {
      expect(thumbnailPosition(id)).toBe('center top');
    }
  });

  it('anchors everything else left', () => {
    for (const id of ['reactbits', 'lucide', 'built']) {
      expect(thumbnailPosition(id)).toBe('left top');
    }
  });

  it('falls back to left for an unknown id rather than returning undefined', () => {
    expect(thumbnailPosition('nope')).toBe('left top');
  });

  it('covers every listing, so no thumbnail is framed by accident', () => {
    for (const resource of resources) {
      expect(['left top', 'center top']).toContain(thumbnailPosition(resource.id));
    }
  });
});
