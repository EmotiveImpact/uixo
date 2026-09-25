import { ALL_FORMATS } from '../types';
import type { BrowseOrder, Category, PriceFilter, Resource } from '../types';

export type FilterState = {
  /** Ids of the resources in the list being viewed, or null for the whole directory. */
  listIds: string[] | null;
  category: string | null;
  sub: string | null;
  price: PriceFilter;
  format: string;
  browse: BrowseOrder;
  search: string;
  /**
   * When true, category/sub match the listing's own fields only.
   * Live /browse also matches tags; the candidates preview does not, so
   * Components is the Components bucket from the scout file.
   */
  exactTaxonomy?: boolean;
};

/** Categories and subcategories also match against a resource's tags, not just its own fields. */
export function matchesCategory(resource: Resource, category: string): boolean {
  return resource.category === category || resource.tags.includes(category);
}

export function matchesSub(resource: Resource, sub: string): boolean {
  return resource.subcategory === sub || resource.tags.includes(sub);
}

/** Everything the search box looks at, including alternative names and use-case phrases. */
export function searchIndex(resource: Resource): string {
  return [
    resource.name,
    resource.description,
    resource.creator,
    resource.category,
    resource.subcategory,
    ...resource.formats,
    ...resource.tags,
    ...resource.aliases,
    resource.pricing,
  ]
    .join(' ')
    .toLowerCase();
}

/** Every whitespace-separated term must appear, so "react animation" narrows rather than widens. */
function matchesSearch(resource: Resource, terms: string[]): boolean {
  if (!terms.length) return true;
  const index = searchIndex(resource);
  return terms.every((term) => index.includes(term));
}

function matches(resource: Resource, state: FilterState, terms: string[]): boolean {
  if (state.listIds && !state.listIds.includes(resource.id)) return false;
  if (state.category) {
    const inCategory = state.exactTaxonomy
      ? resource.category === state.category
      : matchesCategory(resource, state.category);
    if (!inCategory) return false;
  }
  if (state.sub) {
    const inSub = state.exactTaxonomy
      ? resource.subcategory === state.sub
      : matchesSub(resource, state.sub);
    if (!inSub) return false;
  }
  if (state.price !== 'All' && resource.pricing !== state.price) return false;
  if (state.format !== ALL_FORMATS && !resource.formats.includes(state.format)) return false;

  // "Featured" narrows the unfiltered landing view only — once the visitor has picked a
  // category, or is looking at a list, show everything that matches.
  const featuredOnly = state.browse === 'Featured' && !state.category && !state.listIds;
  if (featuredOnly && !resource.featured) return false;

  return matchesSearch(resource, terms);
}

export function filterResources(resources: Resource[], state: FilterState): Resource[] {
  const terms = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return resources
    .filter((resource) => matches(resource, state, terms))
    .sort((a, b) =>
      state.browse === 'Recent' ? b.addedOrder - a.addedOrder : a.addedOrder - b.addedOrder,
    );
}

/**
 * Subcategories that would return at least one resource. Empty ones are hidden rather
 * than shown as dead ends — with a small list most of them are empty.
 */
export function populatedSubs(
  resources: Resource[],
  category: Category,
  exactTaxonomy = false,
): string[] {
  return category.sub.filter((sub) =>
    resources.some((resource) =>
      exactTaxonomy
        ? resource.category === category.name && resource.subcategory === sub
        : matchesCategory(resource, category.name) && matchesSub(resource, sub),
    ),
  );
}

export function categoryCount(
  resources: Resource[],
  category: Category,
  exactTaxonomy = false,
): number {
  return resources.filter((resource) =>
    exactTaxonomy ? resource.category === category.name : matchesCategory(resource, category.name),
  ).length;
}
