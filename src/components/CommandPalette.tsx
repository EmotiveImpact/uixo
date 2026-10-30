import { ArrowRight, Blocks, Globe, Layers3, Search, Shapes } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { searchIndex } from '../lib/filters';
import { navigateInApp } from '../lib/navigation';
import { isPaletteShortcut, OPEN_SEARCH_EVENT } from '../lib/search-palette';
import {
  assetHref,
  catalogueResult,
  EMPTY_ASSET_QUERY,
  registryRequest,
} from '../lib/asset-library';
import type { AssetRecord } from '../lib/asset-library';
import { EMPTY_ROUTE, routeToHref, slugify } from '../lib/url';
import { COMPONENT_CATEGORIES } from '../../shared/component-categories';
import { categories, collections, resources } from '../data';

type Kind = 'component' | 'website' | 'category' | 'collection';
type Item = { id: string; kind: Kind; label: string; hint: string; href: string };
type Group = { kind: Kind; title: string; items: Item[] };

const ICONS = { component: Blocks, website: Globe, category: Shapes, collection: Layers3 } as const;
const GROUP_TITLES: Record<Kind, string> = {
  component: 'Components',
  website: 'Websites',
  category: 'Categories',
  collection: 'Collections',
};
/** Shown with an empty query, and again when a search finds nothing. */
const TOP_CATEGORIES = COMPONENT_CATEGORIES.slice(0, 6);
const componentCategoryHref = (id: string) =>
  assetHref({ ...EMPTY_ASSET_QUERY, kind: 'component', category: id });
const categoryLabel = (id = '') =>
  COMPONENT_CATEGORIES.find((entry) => entry.id === id)?.label ?? 'Component';

/**
 * One search for all of UIXO. ⌘K opens it over the current page from anywhere and never
 * navigates by itself. Components come first, from the same search request as the
 * Components page, then websites, categories and collections in labelled groups.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<{ q: string; items: AssetRecord[] } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const q = query.trim();

  useFocusTrap(panelRef, open);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      // A dialog already holds the page (sign in, submit): leave the shortcut to it.
      if (!open && document.querySelector('dialog[open]')) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Components, from the same search the Components page runs.
  useEffect(() => {
    if (!open || !q) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      void registryRequest<unknown>('search', {
        query: { q, kind: 'component', sort: 'relevant', offset: '0', limit: '6' },
        signal: abort.signal,
      })
        .then(catalogueResult)
        .then((value) => {
          if (!abort.signal.aborted) setFound({ q, items: value.items });
        })
        .catch(() => {
          if (!abort.signal.aborted) setFound({ q, items: [] });
        });
    }, 140);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [open, q]);

  const searching = Boolean(q) && found?.q !== q;
  const groups = useMemo<Group[]>(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (haystack: string) =>
      terms.every((term) => haystack.toLowerCase().includes(term));
    if (!terms.length)
      return [
        {
          kind: 'category',
          title: 'Popular categories',
          items: TOP_CATEGORIES.map((entry) => ({
            id: `cc:${entry.id}`,
            kind: 'category',
            label: entry.label,
            hint: 'Components',
            href: componentCategoryHref(entry.id),
          })),
        },
        {
          kind: 'collection',
          title: GROUP_TITLES.collection,
          items: collections.slice(0, 3).map((entry) => ({
            id: `c:${entry.slug}`,
            kind: 'collection',
            label: entry.name,
            hint: 'Collection',
            href: routeToHref({ ...EMPTY_ROUTE, collectionSlug: entry.slug }),
          })),
        },
      ];
    const components: Item[] = (found?.q === q ? found.items : []).map((asset) => ({
      id: `a:${asset.id}`,
      kind: 'component',
      label: asset.name,
      hint: categoryLabel(asset.category),
      href: assetHref({ ...EMPTY_ASSET_QUERY, id: asset.id }),
    }));
    const websites: Item[] = resources
      .filter((resource) => matches(searchIndex(resource)))
      .slice(0, 5)
      .map((resource) => ({
        id: `r:${resource.id}`,
        kind: 'website',
        label: resource.name,
        hint: resource.category,
        href: routeToHref({ ...EMPTY_ROUTE, resourceId: resource.id }),
      }));
    const categoryItems: Item[] = [
      ...COMPONENT_CATEGORIES.filter((entry) => matches(entry.label)).map((entry) => ({
        id: `cc:${entry.id}`,
        kind: 'category' as const,
        label: entry.label,
        hint: 'Components',
        href: componentCategoryHref(entry.id),
      })),
      ...categories
        .filter((entry) => matches(entry.name))
        .map((entry) => ({
          id: `wc:${entry.name}`,
          kind: 'category' as const,
          label: entry.name,
          hint: 'Websites',
          href: `/category/${slugify(entry.name)}`,
        })),
    ].slice(0, 4);
    const collectionItems: Item[] = collections
      .filter((entry) => matches(`${entry.name} ${entry.tagline}`))
      .slice(0, 3)
      .map((entry) => ({
        id: `c:${entry.slug}`,
        kind: 'collection',
        label: entry.name,
        hint: 'Collection',
        href: routeToHref({ ...EMPTY_ROUTE, collectionSlug: entry.slug }),
      }));
    return (
      [
        { kind: 'component', title: GROUP_TITLES.component, items: components },
        { kind: 'website', title: GROUP_TITLES.website, items: websites },
        { kind: 'category', title: GROUP_TITLES.category, items: categoryItems },
        { kind: 'collection', title: GROUP_TITLES.collection, items: collectionItems },
      ] as Group[]
    ).filter((group) => group.items.length);
  }, [q, found]);

  const empty = Boolean(q) && !searching && groups.length === 0;
  // With nothing found, the way forward is a full search, then the top categories.
  const shown: Group[] = empty
    ? [
        {
          kind: 'category',
          title: 'Top categories',
          items: TOP_CATEGORIES.map((entry) => ({
            id: `cc:${entry.id}`,
            kind: 'category',
            label: entry.label,
            hint: 'Components',
            href: componentCategoryHref(entry.id),
          })),
        },
      ]
    : groups;
  const searchAll: Item | null = q
    ? {
        id: 'search-all',
        kind: 'component',
        label: `Search all components for “${q}”`,
        hint: '',
        href: assetHref({ ...EMPTY_ASSET_QUERY, q }),
      }
    : null;
  const flat = [...(empty && searchAll ? [searchAll] : []), ...shown.flatMap((g) => g.items)];
  const index = Math.min(active, Math.max(flat.length - 1, 0));

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setQuery('');
    setActive(0);
  };
  const choose = (item: Item | undefined) => {
    if (!item) {
      // Enter before anything is listed still finishes the search the reader started.
      if (searchAll) {
        close();
        navigateInApp(searchAll.href);
      }
      return;
    }
    close();
    navigateInApp(item.href);
  };
  const optionId = (item: Item) => `${listId}-${item.id.replace(/[^a-z0-9-]/gi, '-')}`;
  const option = (item: Item) => {
    const position = flat.indexOf(item);
    const Icon = item.id === 'search-all' ? Search : ICONS[item.kind];
    return (
      <li key={item.id} role="none">
        <button
          type="button"
          role="option"
          id={optionId(item)}
          tabIndex={-1}
          aria-selected={position === index}
          className={position === index ? 'active' : ''}
          onMouseEnter={() => setActive(position)}
          onClick={() => choose(item)}
        >
          <Icon size={15} aria-hidden="true" />
          <span className="palette-label">{item.label}</span>
          {item.hint && <span className="palette-hint">{item.hint}</span>}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <div className="palette-layer">
      <div className="palette-scrim" onClick={close} />
      <div
        className="palette"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search UIXO"
      >
        <div className="palette-input">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={flat[index] ? optionId(flat[index]) : undefined}
            placeholder="Search components, websites and collections…"
            aria-label="Search UIXO"
            maxLength={300}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive(Math.min(index + 1, flat.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(Math.max(index - 1, 0));
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                choose(searching ? undefined : flat[index]);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="palette-results" id={listId} role="listbox" aria-label="Results">
          {searching && groups.length === 0 && (
            <p className="palette-status" role="status">
              Searching components…
            </p>
          )}
          {empty && searchAll && (
            <div className="palette-empty">
              <p role="status">No component or website called “{q}”.</p>
              <ul role="none">{option(searchAll)}</ul>
            </div>
          )}
          {shown.map((group) => {
            const headingId = `${listId}-${group.title.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <div key={group.title} role="group" aria-labelledby={headingId}>
                <h3 className="palette-group" id={headingId}>
                  {group.title}
                </h3>
                <ul role="none">{group.items.map(option)}</ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
