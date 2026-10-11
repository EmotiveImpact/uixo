import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { Thumbnail } from './Thumbnail';
import { ComponentCard, ProviderMarkSquare, TintedStage } from './ComponentCard';
import { VisitLine } from './ComponentActions';
import { HeroWall } from './HeroWall';
import { AgentBand } from './AgentBand';
import './homepage.css';
import { DiscoveryHeader } from './discovery/DiscoveryHeader';
import { collections, resources } from '../data';
import { navigateInApp } from '../lib/navigation';
import { useRegistryData } from '../hooks/useRegistryData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { COMPONENT_CATEGORIES } from '../../shared/component-categories';
import { inventoryResult, safeAssetUrl } from '../lib/asset-library';
import type { AssetRecord, Catalogue, ProviderRecord } from '../lib/asset-library';

type LandingPageProps = {
  authAvailable: boolean;
  signedIn: boolean;
  light?: boolean;
  onToggleTheme?: () => void;
  hrefs: {
    browse: string;
    assets: string;
    collections: string;
    collection: (slug: string) => string;
    resource: (id: string) => string;
  };
  onBrowse: () => void;
  onAssets: () => void;
  onCollections: () => void;
  onOpenCollection: (slug: string) => void;
  onOpenResource: (id: string) => void;
  onSignIn: () => void;
  onAbout: () => void;
  savedAssets?: string[];
  onToggleAssetSave?: (id: string) => void;
};

/** Each shelf is hand-picked from components with original live demos. */
const SHELVES = [
  {
    id: 'featured',
    label: 'Featured',
    ids: [
      'magic-ui/shimmer-button',
      'magic-ui/aurora-text',
      'magic-ui/retro-grid',
      'motion-primitives/text-effect',
      'shadcn/calendar',
      'magic-ui/dock',
    ],
  },
  {
    id: 'buttons',
    label: 'Buttons',
    ids: [
      'magic-ui/shimmer-button',
      'magic-ui/animated-subscribe-button',
      'magic-ui/rainbow-button',
      'magic-ui/interactive-hover-button',
      'magic-ui/pulsating-button',
      'simply-buttons/arttech-download',
    ],
  },
  {
    id: 'text',
    label: 'Text',
    ids: [
      'magic-ui/aurora-text',
      'motion-primitives/text-effect',
      'magic-ui/word-rotate',
      'magic-ui/hyper-text',
      'magic-ui/number-ticker',
      'magic-ui/typing-animation',
    ],
  },
  {
    id: 'backgrounds',
    label: 'Backgrounds',
    ids: [
      'magic-ui/retro-grid',
      'magic-ui/dot-pattern',
      'magic-ui/animated-grid-pattern',
      'magic-ui/ripple',
      'magic-ui/flickering-grid',
      'magic-ui/particles',
    ],
  },
] as const;
type Shelf = (typeof SHELVES)[number]['id'];

const categoryName = (id = 'other') =>
  id === 'other'
    ? 'Everything else'
    : (COMPONENT_CATEGORIES.find((entry) => entry.id === id)?.label ?? id);

/** Glyphs drawn on a 112 x 60 box, in currentColor, as on the approved mockup. */
const GLYPHS: Record<string, string> = {
  buttons:
    '<rect x="16" y="18" width="80" height="26" rx="13" fill="currentColor" fill-opacity=".9"/><rect x="34" y="29" width="30" height="4" rx="2" fill="var(--g-glyph-ink)"/><path d="M70 31h8m-3-3 3 3-3 3" stroke="var(--g-glyph-ink)" stroke-width="2" fill="none" stroke-linecap="round"/>',
  forms:
    '<rect x="14" y="10" width="26" height="4" rx="2" fill="currentColor" fill-opacity=".6"/><rect x="14" y="20" width="84" height="26" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="22" y="30" width="34" height="5" rx="2.5" fill="currentColor" fill-opacity=".5"/><rect x="60" y="27" width="2" height="12" rx="1" fill="currentColor"/>',
  navigation:
    '<rect x="6" y="18" width="100" height="24" rx="12" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".4"/><circle cx="20" cy="30" r="5" fill="currentColor"/><rect x="34" y="28" width="14" height="4" rx="2" fill="currentColor" fill-opacity=".7"/><rect x="54" y="28" width="14" height="4" rx="2" fill="currentColor" fill-opacity=".5"/><rect x="80" y="23" width="20" height="14" rx="7" fill="currentColor"/>',
  layout:
    '<rect x="20" y="6" width="44" height="48" rx="6" fill="currentColor" fill-opacity=".85"/><rect x="68" y="6" width="24" height="22" rx="6" fill="currentColor" fill-opacity=".45"/><rect x="68" y="32" width="24" height="22" rx="6" fill="currentColor" fill-opacity=".25"/>',
  overlays:
    '<rect x="10" y="4" width="92" height="52" rx="8" fill="currentColor" fill-opacity=".1"/><rect x="28" y="14" width="56" height="36" rx="7" fill="currentColor" fill-opacity=".9"/><rect x="36" y="22" width="26" height="4" rx="2" fill="var(--g-glyph-ink)"/><rect x="36" y="30" width="36" height="3" rx="1.5" fill="var(--g-glyph-ink)" fill-opacity=".5"/><rect x="62" y="38" width="16" height="7" rx="3.5" fill="var(--g-glyph-ink)"/>',
  'data-display':
    '<rect x="22" y="34" width="10" height="20" rx="3" fill="currentColor" fill-opacity=".45"/><rect x="38" y="20" width="10" height="34" rx="3" fill="currentColor" fill-opacity=".7"/><rect x="54" y="28" width="10" height="26" rx="3" fill="currentColor" fill-opacity=".55"/><rect x="70" y="8" width="10" height="46" rx="3" fill="currentColor"/><rect x="86" y="24" width="10" height="30" rx="3" fill="currentColor" fill-opacity=".6"/>',
  feedback:
    '<rect x="10" y="16" width="92" height="28" rx="14" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".4"/><circle cx="26" cy="30" r="8" fill="currentColor"/><path d="m22.5 30 2.5 2.5 4.5-5" stroke="var(--g-glyph-ink)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="40" y="27" width="44" height="5" rx="2.5" fill="currentColor" fill-opacity=".7"/>',
  text: '<text x="56" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="currentColor">Aa</text>',
  backgrounds:
    '<defs><linearGradient id="hm-glyph-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".95"/><stop offset="1" stop-color="currentColor" stop-opacity=".1"/></linearGradient></defs><rect x="20" y="6" width="72" height="48" rx="10" fill="url(#hm-glyph-bg)"/><circle cx="70" cy="20" r="9" fill="var(--g-glyph-ink)" fill-opacity=".25"/>',
  media:
    '<rect x="22" y="6" width="68" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="72" cy="20" r="6" fill="currentColor"/><path d="M24 50 46 28l14 14 8-8 20 18" fill="currentColor" fill-opacity=".55"/>',
  motion:
    '<path d="M14 50C30 50 34 12 56 12s30 30 42 30" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" opacity=".6"/><circle cx="20" cy="49" r="3" fill="currentColor" fill-opacity=".3"/><circle cx="56" cy="12" r="4" fill="currentColor" fill-opacity=".55"/><circle cx="96" cy="41" r="8" fill="currentColor"/>',
  other:
    '<g fill="currentColor">' +
    [0, 1, 2]
      .map((row) =>
        [0, 1, 2]
          .map(
            (column) =>
              `<circle cx="${40 + column * 16}" cy="${14 + row * 16}" r="4.5" fill-opacity="${row === 1 && column === 1 ? 1 : 0.45}"/>`,
          )
          .join(''),
      )
      .join('') +
    '</g>',
};

const CATEGORY_HUES: Record<string, number> = {
  buttons: 268,
  forms: 200,
  navigation: 226,
  layout: 180,
  overlays: 300,
  'data-display': 156,
  feedback: 140,
  text: 34,
  backgrounds: 322,
  media: 14,
  motion: 190,
  other: 250,
};

const COLLECTION_HUES = [246, 24, 188, 322, 156, 268];
const WEBSITE_HUES = [232, 16, 150, 300, 200, 268];

type CardLinks = {
  href: (id: string) => string;
  providerName: (id: string) => string;
  saved: (id: string) => boolean;
  toggleSave?: (id: string) => void;
};

function PendingCard({ failed }: { failed: boolean }) {
  return (
    <div className="g-card g-card-pending" aria-busy={!failed}>
      <div className="g-stage g-tint" style={{ '--h': 250 } as CSSProperties}>
        <span className="g-pending-label">
          {failed ? 'Preview unavailable' : 'Loading component…'}
        </span>
      </div>
      <div className="g-meta" aria-hidden="true">
        <span className="g-skeleton" />
        <span className="g-skeleton is-short" />
      </div>
    </div>
  );
}

function ShelfComponent({ id, links }: { id: string; links: CardLinks }) {
  const { data, error } = useRegistryData<AssetRecord>('asset', { id });
  if (!data) return <PendingCard failed={!!error} />;
  const href = links.href(data.id);
  return (
    <ComponentCard
      asset={data}
      className="component-tile"
      href={href}
      onOpen={() => navigateInApp(href)}
      providerName={links.providerName(data.providerId)}
      categoryLabel={categoryName(data.category)}
      saved={links.saved(data.id)}
      onToggleSave={links.toggleSave && (() => links.toggleSave?.(data.id))}
    />
  );
}

/** One glowing switch; the indicator slides to the chosen shelf. */
function ShelfSwitch({ shelf, onChange }: { shelf: Shelf; onChange: (shelf: Shelf) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const place = () => {
      const chosen = element.querySelector<HTMLElement>('[aria-selected="true"]');
      if (chosen) setIndicator({ left: chosen.offsetLeft, width: chosen.offsetWidth });
    };
    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(element);
    void document.fonts?.ready.then(place);
    return () => observer?.disconnect();
  }, [shelf]);
  const choose = (next: Shelf, focus = false) => {
    onChange(next);
    const button = list.current?.querySelector<HTMLElement>(`[data-shelf="${next}"]`);
    if (focus) button?.focus();
    const wrap = scroller.current;
    if (button && wrap && wrap.scrollWidth > wrap.clientWidth)
      wrap.scrollTo({
        left: button.offsetLeft - wrap.clientWidth / 2 + button.offsetWidth / 2,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SHELVES.findIndex((item) => item.id === shelf);
    const step =
      event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowLeft'
          ? -1
          : event.key === 'Home'
            ? 0
            : 0;
    if (event.key === 'Home') return choose(SHELVES[0].id, true);
    if (event.key === 'End') return choose(SHELVES[SHELVES.length - 1].id, true);
    if (!step) return;
    event.preventDefault();
    choose(SHELVES[(index + step + SHELVES.length) % SHELVES.length].id, true);
  };
  return (
    <div className="hm-shelf-wrap" ref={scroller}>
      <div
        className="hm-shelf"
        role="tablist"
        aria-label="Component shelf"
        ref={list}
        onKeyDown={onKeyDown}
      >
        {indicator && (
          <span
            className="hm-shelf-ind"
            aria-hidden="true"
            style={{ width: indicator.width, transform: `translateX(${indicator.left - 5}px)` }}
          />
        )}
        {SHELVES.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`shelf-tab-${item.id}`}
            data-shelf={item.id}
            aria-selected={shelf === item.id}
            aria-controls="shelf-panel"
            tabIndex={shelf === item.id ? 0 : -1}
            onClick={() => choose(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LandingPage({
  authAvailable,
  signedIn,
  light = false,
  onToggleTheme = () => {},
  hrefs,
  onBrowse,
  onAssets,
  onCollections,
  onOpenCollection,
  onOpenResource,
  onSignIn,
  savedAssets = [],
  onToggleAssetSave,
}: LandingPageProps) {
  const [q, setQ] = useState('');
  useDocumentTitle(null);
  const [shelf, setShelf] = useState<Shelf>('featured');
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: catalogue } = useRegistryData<Catalogue>('search', {
    kind: 'component',
    limit: '1',
  });
  const { data: providerList } = useRegistryData<{ items: ProviderRecord[] }>('providers');
  const { data: latest } = useRegistryData<Catalogue>('search', {
    kind: 'component',
    sort: 'newest',
    limit: '1',
  });
  const { data: rawInventory } = useRegistryData<unknown>('inventory');
  let categoryCounts: Record<string, number> = {};
  try {
    if (rawInventory)
      categoryCounts = Object.fromEntries(
        inventoryResult(rawInventory).categories.map((entry) => [entry.id, entry.count]),
      );
  } catch {
    categoryCounts = {};
  }
  const categories = COMPONENT_CATEGORIES.filter((entry) => categoryCounts[entry.id]);
  const libraries = providerList?.items.filter((provider) => provider.assetCount > 0).length ?? 0;
  const newest = latest?.items[0];
  const total = catalogue ? catalogue.total.toLocaleString('en-GB') : '';
  const links: CardLinks = {
    href: (id) => `${hrefs.assets}?id=${encodeURIComponent(id)}`,
    providerName: (id) => providerList?.items.find((p) => p.id === id)?.name ?? id,
    saved: (id) => savedAssets.includes(id),
    toggleSave: onToggleAssetSave,
  };
  const websites = resources.filter((item) => item.featured).slice(0, 3);
  const follow = (event: MouseEvent<HTMLAnchorElement>, run: () => void) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    run();
  };
  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) =>
    follow(event, () => navigateInApp(href));
  const popular: [string, string][] = [
    ['Buttons', `${hrefs.assets}?category=buttons&kind=component`],
    ['Text effects', `${hrefs.assets}?category=text&kind=component`],
    ['Backgrounds', `${hrefs.assets}?category=backgrounds&kind=component`],
    ['Calendars', `${hrefs.assets}?q=calendar`],
  ];
  const current = SHELVES.find((item) => item.id === shelf) ?? SHELVES[0];
  const shelfHref =
    shelf === 'featured'
      ? `${hrefs.assets}?kind=component`
      : `${hrefs.assets}?category=${shelf}&kind=component`;

  return (
    <div className="home">
      <DiscoveryHeader
        active="discover"
        compactNavigation
        light={light}
        onToggleTheme={onToggleTheme}
        onSearch={() => searchRef.current?.focus()}
        account={
          authAvailable && !signedIn ? (
            <button className="header-signin" onClick={onSignIn}>
              Sign in
            </button>
          ) : null
        }
      />
      <main>
        <section className="hm-hero" aria-labelledby="home-title">
          <HeroWall />
          {newest && (
            <a
              className="hm-newpill"
              href={links.href(newest.id)}
              onClick={(event) => go(event, links.href(newest.id))}
            >
              <span className="hm-tag-new">New</span>
              <span>
                {newest.name} from {links.providerName(newest.providerId)}
              </span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          )}
          <h1 id="home-title">
            {catalogue ? <b className="hm-num">{total}</b> : 'Hundreds of'} components
            <br className="hm-br" /> to try, copy and ship.
          </h1>
          <p className="hm-lede">
            Hundreds run live right here on the page, with the install command or the source one
            click away.
          </p>
          <form
            className="hm-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigateInApp(`${hrefs.assets}?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              id="hero-component-search"
              type="search"
              aria-label="Search components"
              aria-keyshortcuts="Meta+K Control+K"
              maxLength={300}
              placeholder="Search buttons, text effects, calendars…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <kbd aria-hidden="true">⌘K</kbd>
            <button type="submit" aria-label="Search">
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <nav className="hm-popular" aria-label="Popular searches">
            <span>Popular</span>
            {popular.map(([label, href]) => (
              <a key={label} href={href} onClick={(event) => go(event, href)}>
                {label}
              </a>
            ))}
          </nav>
          {libraries > 0 && categories.length > 0 && (
            <p className="hm-trust">
              <span>
                <i className="hm-pulse" aria-hidden="true" />
                {libraries} libraries
              </span>
              <i className="hm-dot" aria-hidden="true" />
              <span>{categories.length} categories</span>
              <i className="hm-dot" aria-hidden="true" />
              <span>An MCP server for your AI agent</span>
            </p>
          )}
        </section>

        <ShelfSwitch shelf={shelf} onChange={setShelf} />

        <div className="hm-wrap">
          <section
            className="hm-grid"
            id="shelf-panel"
            role="tabpanel"
            aria-labelledby={`shelf-tab-${shelf}`}
            key={shelf}
          >
            {current.ids.map((id) => (
              <ShelfComponent key={id} id={id} links={links} />
            ))}
          </section>
          <div className="hm-more">
            <a
              className="hm-btn-quiet"
              href={shelfHref}
              onClick={(event) =>
                follow(event, shelf === 'featured' ? onAssets : () => navigateInApp(shelfHref))
              }
            >
              {shelf === 'featured'
                ? `Browse all ${total} components`
                : `Browse all ${current.label.toLowerCase()}`}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          {categories.length > 0 && (
            <section className="hm-section" aria-labelledby="categories-title">
              <div className="hm-sec-head">
                <div>
                  <p className="hm-kicker">Categories</p>
                  <h2 id="categories-title">Find the piece you are missing.</h2>
                </div>
                <a
                  className="hm-sec-link"
                  href={`${hrefs.assets}?kind=component`}
                  onClick={(event) => go(event, `${hrefs.assets}?kind=component`)}
                >
                  All components
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
              <div className="hm-tiles">
                {categories.map((entry) => {
                  const href = `${hrefs.assets}?category=${entry.id}&kind=component`;
                  const count = categoryCounts[entry.id];
                  return (
                    <a
                      key={entry.id}
                      className="hm-tile"
                      href={href}
                      style={{ '--h': CATEGORY_HUES[entry.id] ?? 250 } as CSSProperties}
                      onClick={(event) => go(event, href)}
                    >
                      <span className="hm-glyph" aria-hidden="true">
                        <svg
                          viewBox="0 0 112 60"
                          dangerouslySetInnerHTML={{ __html: GLYPHS[entry.id] ?? GLYPHS.other }}
                        />
                      </span>
                      <strong>{categoryName(entry.id)}</strong>
                      <span className="hm-tile-count">
                        <span>
                          <em>{count.toLocaleString('en-GB')}</em>{' '}
                          {count === 1 ? 'component' : 'components'}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <AgentBand
            href={`${hrefs.assets}?view=connect`}
            guideHref={`${hrefs.assets}?view=guide`}
            onFollow={go}
          />

          <section className="hm-section" aria-labelledby="collections-title">
            <div className="hm-sec-head">
              <div>
                <p className="hm-kicker">Collections</p>
                <h2 id="collections-title">Start from a set that works together.</h2>
              </div>
              <a
                className="hm-sec-link"
                href={hrefs.collections}
                onClick={(event) => follow(event, onCollections)}
              >
                All collections
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
            <div className="hm-grid">
              {collections.slice(0, 3).map((item, index) => {
                const members = item.resourceIds
                  .map((id) => resources.find((resource) => resource.id === id))
                  .filter((resource) => resource !== undefined);
                const names = members.map((resource) => resource.name);
                const shown = names.slice(0, 2);
                return (
                  <article className="g-card hm-cover" key={item.slug}>
                    <TintedStage
                      hue={COLLECTION_HUES[index % COLLECTION_HUES.length]}
                      className="hm-cover-stage"
                    >
                      {members.slice(0, 3).map((resource, n) => (
                        <span className={`hm-cover-shot is-${n}`} key={resource.id}>
                          <span className="hm-winbar" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          <Thumbnail
                            id={resource.id}
                            alt=""
                            sizes="(max-width: 680px) 80vw, 22vw"
                            onError={() => {}}
                          />
                        </span>
                      ))}
                    </TintedStage>
                    <div
                      className="g-meta hm-cover-meta"
                      onClick={(event) => {
                        if ((event.target as Element).closest('a')) return;
                        onOpenCollection(item.slug);
                      }}
                    >
                      <h3>
                        <a
                          href={hrefs.collection(item.slug)}
                          onClick={(event) => follow(event, () => onOpenCollection(item.slug))}
                        >
                          {item.name}
                        </a>
                        <ArrowRight size={16} aria-hidden="true" />
                      </h3>
                      <p>{item.tagline}</p>
                      <div className="hm-marks">
                        <span className="hm-mark-stack" aria-hidden="true">
                          {members.slice(0, 3).map((resource) => (
                            <ProviderMarkSquare
                              key={resource.id}
                              id={resource.id}
                              name={resource.name}
                            />
                          ))}
                        </span>
                        <span>
                          {members.length} {members.length === 1 ? 'resource' : 'resources'}:{' '}
                          {shown.join(', ')}
                          {names.length > shown.length
                            ? ` and ${names.length - shown.length} more`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="hm-section" aria-labelledby="websites-title">
            <div className="hm-sec-head">
              <div>
                <p className="hm-kicker">Beyond components</p>
                <h2 id="websites-title">Websites and libraries</h2>
              </div>
              <a
                className="hm-sec-link"
                href={hrefs.browse}
                onClick={(event) => follow(event, onBrowse)}
              >
                All {resources.length} resources
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
            <div className="hm-grid">
              {websites.map((item, index) => {
                const site = safeAssetUrl(item.url);
                return (
                  <article
                    key={item.id}
                    className="g-card hm-site"
                    style={{ '--h': WEBSITE_HUES[index % WEBSITE_HUES.length] } as CSSProperties}
                  >
                    <TintedStage hue={WEBSITE_HUES[index % WEBSITE_HUES.length]}>
                      <span className="hm-shotwin">
                        <span className="hm-winbar" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <Thumbnail
                          id={item.id}
                          alt={`${item.name} website screenshot`}
                          sizes="(max-width: 680px) 90vw, 30vw"
                          onError={() => {}}
                        />
                      </span>
                    </TintedStage>
                    <div
                      className="g-meta"
                      onClick={(event) => {
                        if ((event.target as Element).closest('a')) return;
                        onOpenResource(item.id);
                      }}
                    >
                      <div className="g-r1">
                        <h3>
                          <a
                            className="g-name"
                            href={hrefs.resource(item.id)}
                            onClick={(event) => follow(event, () => onOpenResource(item.id))}
                          >
                            {item.name}
                          </a>
                        </h3>
                        <span className="g-price">{item.pricing}</span>
                      </div>
                      <div className="g-r2">
                        <ProviderMarkSquare
                          id={item.creator.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                          name={item.creator}
                        />
                        <span className="g-provider">{item.creator}</span>
                        <span className="g-sep" aria-hidden="true">
                          ›
                        </span>
                        <span>{item.category}</span>
                      </div>
                      {site && <VisitLine href={site} name={item.name} />}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
