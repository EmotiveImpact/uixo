import { ALL_FORMATS, PRICE_FILTERS } from '../types';
import type { BrowseOrder, PriceFilter } from '../types';
import { categories, collections, formats, resources } from '../data';

export type RouteState = {
  category: string | null;
  sub: string | null;
  listId: string | null;
  /** Resource whose quick view is open. */
  resourceId: string | null;
  /** Editorial collection being viewed, by slug. */
  collectionSlug: string | null;
  /** True for the collections index page. */
  collectionsIndex: boolean;
  /** The signed-in dashboard. */
  dashboard: boolean;
  /** The curator-only candidate review inbox. */
  review: boolean;
  /** Public browse of every staged scout candidate. Not live listings. */
  candidates: boolean;
  /** The curator-only operational dashboard. */
  admin: boolean;
  /** Set when the path matched nothing we know about. */
  notFound: boolean;
  /** The marketing surface at "/", which renders without the app shell. */
  landing: boolean;
  search: string;
  price: PriceFilter;
  format: string;
  browse: BrowseOrder;
};

export const EMPTY_ROUTE: RouteState = {
  category: null,
  sub: null,
  listId: null,
  resourceId: null,
  collectionSlug: null,
  collectionsIndex: false,
  dashboard: false,
  review: false,
  candidates: false,
  admin: false,
  notFound: false,
  landing: false,
  search: '',
  price: 'All',
  format: ALL_FORMATS,
  browse: 'Featured',
};

/** The front door. Kept separate from EMPTY_ROUTE, which is the directory's default view. */
export const LANDING_ROUTE: RouteState = { ...EMPTY_ROUTE, landing: true };

/** Where the directory itself lives, now that "/" is the landing page. */
export const BROWSE_PATH = '/browse';

/** Public scan of staged scout candidates. Not the live directory. */
export const CANDIDATES_PATH = '/candidates';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function findCategory(slug: string) {
  return categories.find((category) => slugify(category.name) === slug) ?? null;
}

/** Builds the path + query for a route. Used for both history writes and real hrefs. */
export function routeToHref(route: RouteState): string {
  let path = BROWSE_PATH;
  if (route.landing) {
    path = '/';
  } else if (route.resourceId) {
    path = `/r/${route.resourceId}`;
  } else if (route.dashboard) {
    path = '/dashboard';
  } else if (route.review) {
    path = '/review';
  } else if (route.candidates) {
    path = CANDIDATES_PATH;
    if (route.category) {
      path = `${CANDIDATES_PATH}/category/${slugify(route.category)}`;
      if (route.sub) path += `/${slugify(route.sub)}`;
    }
  } else if (route.admin) {
    path = '/admin';
  } else if (route.collectionSlug) {
    path = `/collections/${route.collectionSlug}`;
  } else if (route.collectionsIndex) {
    path = '/collections';
  } else if (route.listId) {
    path = `/list/${route.listId}`;
  } else if (route.category) {
    path = `/category/${slugify(route.category)}`;
    if (route.sub) path += `/${slugify(route.sub)}`;
  }

  const params = new URLSearchParams();
  if (route.search.trim()) params.set('q', route.search.trim());
  if (route.price !== 'All') params.set('price', route.price);
  if (route.format !== ALL_FORMATS) params.set('format', route.format);
  const defaultBrowse = route.candidates ? 'Recent' : 'Featured';
  if (route.browse !== defaultBrowse) params.set('browse', route.browse);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function parseRoute(pathname: string, searchParams: string): RouteState {
  const params = new URLSearchParams(searchParams);
  const segments = pathname.split('/').filter(Boolean);

  const route: RouteState = {
    ...EMPTY_ROUTE,
    search: params.get('q') ?? '',
    // Unknown values fall back rather than filtering everything out silently.
    price: PRICE_FILTERS.includes(params.get('price') as PriceFilter)
      ? (params.get('price') as PriceFilter)
      : 'All',
    format: formats.includes(params.get('format') ?? '') ? params.get('format')! : ALL_FORMATS,
    browse: params.get('browse') === 'Recent' ? 'Recent' : 'Featured',
  };

  // "/" is the landing page; the directory starts at /browse.
  if (!segments.length) return { ...route, landing: true };
  if (segments[0] === 'browse' && !segments[1]) return route;

  if (segments[0] === 'r' && segments[1]) {
    const resource = resources.find((entry) => entry.id === segments[1]);
    if (!resource) return { ...route, notFound: true };
    route.resourceId = resource.id;
    route.category = resource.category;
    return route;
  }

  if (segments[0] === 'dashboard') {
    route.dashboard = true;
    return route;
  }

  if (segments[0] === 'review') {
    route.review = true;
    return route;
  }

  if (segments[0] === 'candidates') {
    route.candidates = true;
    route.browse = params.get('browse') === 'Featured' ? 'Featured' : 'Recent';
    const requestedFormat = params.get('format');
    if (requestedFormat && requestedFormat !== ALL_FORMATS) route.format = requestedFormat;
    if (!segments[1]) return route;
    if (segments[1] === 'category' && segments[2]) {
      const category = findCategory(segments[2]);
      if (!category) return { ...route, notFound: true };
      route.category = category.name;
      if (segments[3]) {
        const sub = category.sub.find((entry) => slugify(entry) === segments[3]);
        if (!sub) return { ...route, notFound: true };
        route.sub = sub;
      }
      if (segments[4]) return { ...route, notFound: true };
      return route;
    }
    return { ...route, notFound: true };
  }

  if (segments[0] === 'admin' && !segments[1]) {
    route.admin = true;
    return route;
  }

  if (segments[0] === 'collections') {
    if (!segments[1]) {
      route.collectionsIndex = true;
      return route;
    }
    const collection = collections.find((entry) => entry.slug === segments[1]);
    if (!collection) return { ...route, notFound: true };
    route.collectionSlug = collection.slug;
    return route;
  }

  if (segments[0] === 'list' && segments[1]) {
    route.listId = segments[1];
    return route;
  }

  if (segments[0] === 'category' && segments[1]) {
    const category = findCategory(segments[1]);
    if (!category) return { ...route, notFound: true };
    route.category = category.name;
    if (segments[2]) {
      const sub = category.sub.find((entry) => slugify(entry) === segments[2]);
      if (!sub) return { ...route, notFound: true };
      route.sub = sub;
    }
    return route;
  }

  return { ...route, notFound: true };
}

export function readRoute(): RouteState {
  if (typeof window === 'undefined') return { ...EMPTY_ROUTE };
  return parseRoute(window.location.pathname, window.location.search);
}
