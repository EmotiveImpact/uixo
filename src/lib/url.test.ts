import { describe, expect, it } from 'vitest';
import { EMPTY_ROUTE, LANDING_ROUTE, parseRoute, routeToHref, slugify } from './url';

const route = (over: Partial<typeof EMPTY_ROUTE> = {}) => ({ ...EMPTY_ROUTE, ...over });

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('UI libraries')).toBe('ui-libraries');
    expect(slugify('Sans serif')).toBe('sans-serif');
  });
});

describe('routeToHref', () => {
  it('renders the landing page at the root', () => {
    expect(routeToHref(LANDING_ROUTE)).toBe('/');
  });

  it('renders the unfiltered directory at /browse', () => {
    expect(routeToHref(route())).toBe('/browse');
  });

  it('renders category and subcategory paths', () => {
    expect(routeToHref(route({ category: 'UI libraries' }))).toBe('/category/ui-libraries');
    expect(routeToHref(route({ category: 'Icons', sub: 'Outline' }))).toBe(
      '/category/icons/outline',
    );
  });

  it('renders resource and list paths', () => {
    expect(routeToHref(route({ resourceId: 'lucide' }))).toBe('/r/lucide');
    expect(routeToHref(route({ listId: 'favourites' }))).toBe('/list/favourites');
  });

  it('omits filters that are at their default', () => {
    expect(routeToHref(route({ price: 'All', browse: 'Featured' }))).toBe('/browse');
  });

  it('serialises active filters into the query', () => {
    expect(routeToHref(route({ search: 'react', price: 'Free', browse: 'Recent' }))).toBe(
      '/browse?q=react&price=Free&browse=Recent',
    );
  });

  it('trims whitespace-only searches out of the URL', () => {
    expect(routeToHref(route({ search: '   ' }))).toBe('/browse');
  });
});

describe('parseRoute', () => {
  it('round-trips every route through href and back', () => {
    const cases = [
      LANDING_ROUTE,
      route(),
      route({ category: 'Icons' }),
      route({ category: 'Icons', sub: 'Outline' }),
      route({ listId: 'favourites' }),
      route({ dashboard: true }),
      route({ review: true }),
      route({ admin: true }),
      route({ search: 'react bits', price: 'Freemium', format: 'React', browse: 'Recent' }),
    ];

    for (const original of cases) {
      const href = routeToHref(original);
      const [path, query = ''] = href.split('?');
      expect(parseRoute(path, query)).toEqual(original);
    }
  });

  it('keeps the protected admin workspace addressable', () => {
    expect(routeToHref(route({ admin: true }))).toBe('/admin');
    expect(parseRoute('/admin', '')).toEqual(route({ admin: true }));
    expect(parseRoute('/admin/anything', '').notFound).toBe(true);
  });

  it('puts a deep-linked resource in the context of its own category', () => {
    const parsed = parseRoute('/r/lucide', '');
    expect(parsed.resourceId).toBe('lucide');
    expect(parsed.category).toBe('Icons');
  });

  it('ignores an unknown resource id', () => {
    expect(parseRoute('/r/nope', '').resourceId).toBeNull();
  });

  it('ignores an unknown category slug', () => {
    expect(parseRoute('/category/nope', '').category).toBeNull();
  });

  it('ignores a subcategory that does not belong to the category', () => {
    const parsed = parseRoute('/category/icons/webflow', '');
    expect(parsed.category).toBe('Icons');
    expect(parsed.sub).toBeNull();
  });

  it('falls back to Featured for an unrecognised browse value', () => {
    expect(parseRoute('/browse', 'browse=Nonsense').browse).toBe('Featured');
  });
});

describe('the landing / directory split', () => {
  it('treats the root as the landing page, not the directory', () => {
    const parsed = parseRoute('/', '');
    expect(parsed.landing).toBe(true);
    expect(parsed.notFound).toBe(false);
  });

  it('treats /browse as the directory', () => {
    const parsed = parseRoute('/browse', '');
    expect(parsed.landing).toBe(false);
    expect(parsed.notFound).toBe(false);
  });

  it('carries filters through /browse', () => {
    expect(parseRoute('/browse', 'q=icons&price=Free')).toMatchObject({
      landing: false,
      search: 'icons',
      price: 'Free',
    });
  });

  it('does not treat a deeper /browse path as valid', () => {
    expect(parseRoute('/browse/nonsense', '').notFound).toBe(true);
  });
});

describe('hostile URLs', () => {
  it('falls back on an unknown pricing value instead of filtering everything out', () => {
    expect(parseRoute('/browse', 'price=Banana').price).toBe('All');
  });

  it('falls back on an unknown format', () => {
    expect(parseRoute('/browse', 'format=Papyrus').format).toBe('All formats');
  });

  it('keeps a valid pricing value', () => {
    expect(parseRoute('/browse', 'price=Freemium').price).toBe('Freemium');
  });
});

describe('landing route serialisation', () => {
  it('never carries filters onto the landing page', () => {
    expect(routeToHref({ ...LANDING_ROUTE, search: 'react', price: 'Free' })).toBe(
      '/?q=react&price=Free',
    );
  });

  it('leaves the landing flag behind when navigating into the directory', () => {
    expect(routeToHref({ ...LANDING_ROUTE, landing: false, category: 'Icons' })).toBe(
      '/category/icons',
    );
  });
});
