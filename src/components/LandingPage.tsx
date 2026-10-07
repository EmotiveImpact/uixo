import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronRight, Search } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { Thumbnail } from './Thumbnail';
import { AssetPreview } from './AssetPreview';
import './homepage.css';
import { DiscoveryHeader } from './discovery/DiscoveryHeader';
import { collections, resources, thumbnailPosition } from '../data';
import { navigateInApp } from '../lib/navigation';
import { newThreshold } from '../lib/freshness';
import { useRegistryData } from '../hooks/useRegistryData';
import type { AssetRecord, Catalogue, ProviderRecord } from '../lib/asset-library';

const NEW_FROM = newThreshold(resources);

/** Real thumbnails scattered behind the hero, as UI8 does with its own products. */
const COLLAGE = resources
  .filter((item) => item.featured)
  .slice(0, 8)
  .map((item) => item.id);

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
};

// Components with original live demos, chosen to show range on first load.
const FEATURED_COMPONENTS = [
  'magic-ui/aurora-text',
  'magic-ui/shimmer-button',
  'shadcn/calendar',
  'motion-primitives/text-effect',
  'magic-ui/animated-beam',
  'magic-ui/terminal',
  'magic-ui/dock',
  'magic-ui/retro-grid',
];

const SHELVES = [
  { id: 'featured', label: 'Featured' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'text', label: 'Text effects' },
  { id: 'backgrounds', label: 'Backgrounds' },
] as const;
type Shelf = (typeof SHELVES)[number]['id'];

const categoryLabel = (id = 'other') =>
  id === 'other' ? 'Components' : (id.charAt(0).toUpperCase() + id.slice(1)).replace('-', ' ');

type CardLinks = { href: (id: string) => string; providerName: (id: string) => string };

function ComponentCard({ asset, links }: { asset: AssetRecord; links: CardLinks }) {
  const provider = links.providerName(asset.providerId);
  const href = links.href(asset.id);
  return (
    <article className="discovery-product component-tile">
      <AssetPreview asset={asset} />
      <div className="card-heading">
        <a
          href={href}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateInApp(href);
          }}
        >
          {asset.name}
        </a>
        <span className="card-price">{asset.price === 'free' ? 'Free' : asset.price}</span>
      </div>
      <div className="card-byline">
        <span className="creator-avatar" aria-hidden="true">
          {provider.charAt(0)}
        </span>
        <span className="creator-name">{provider}</span>
        <ChevronRight size={12} aria-hidden="true" />
        <span>{categoryLabel(asset.category)}</span>
      </div>
    </article>
  );
}

function PendingCard({ failed }: { failed: boolean }) {
  return (
    <div className="discovery-product component-tile" aria-busy={!failed}>
      <div className="home-preview-pending">
        {failed ? 'Preview unavailable' : 'Loading component…'}
      </div>
    </div>
  );
}

function FeaturedComponent({ id, links }: { id: string; links: CardLinks }) {
  const { data, error } = useRegistryData<AssetRecord>('asset', { id });
  return data ? <ComponentCard asset={data} links={links} /> : <PendingCard failed={!!error} />;
}

function ShelfComponents({ category, links }: { category: string; links: CardLinks }) {
  const { data, error } = useRegistryData<Catalogue>('search', {
    kind: 'component',
    category,
    limit: '8',
  });
  if (!data) return Array.from({ length: 8 }, (_, i) => <PendingCard key={i} failed={!!error} />);
  return data.items.map((asset) => <ComponentCard key={asset.id} asset={asset} links={links} />);
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
}: LandingPageProps) {
  const [q, setQ] = useState('');
  const [shelf, setShelf] = useState<Shelf>('featured');
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: catalogue } = useRegistryData<Catalogue>('search', {
    kind: 'component',
    limit: '1',
  });
  const { data: providerList } = useRegistryData<{ items: ProviderRecord[] }>('providers');
  const links: CardLinks = {
    href: (id) => `${hrefs.assets}?id=${encodeURIComponent(id)}`,
    providerName: (id) => providerList?.items.find((p) => p.id === id)?.name ?? id,
  };
  const websites = resources.filter((item) => item.featured).slice(0, 6);
  const internal = (event: React.MouseEvent<HTMLAnchorElement>, run: () => void) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    run();
  };
  return (
    <div className="discovery-home">
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
      <main className="discovery-container">
        <section className="ui8-hero">
          <div className="ui8-hero-collage" aria-hidden="true">
            {COLLAGE.map((id) => (
              <img key={id} src={`/assets/${id}.png`} alt="" loading="lazy" />
            ))}
          </div>
          <div className="ui8-hero-copy">
            <h1>
              {catalogue
                ? `${catalogue.total.toLocaleString('en-GB')} live components`
                : 'Live components'}{' '}
              to try, copy and ship in your next build.
            </h1>
            <p className="hero-description">
              Every one runs right here in the page, with the original source one click away.
            </p>
            <form
              className="hero-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigateInApp(`${hrefs.assets}?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <Search size={19} />
              <input
                ref={searchRef}
                id="hero-component-search"
                type="search"
                aria-label="Search components"
                maxLength={300}
                placeholder="Search buttons, text effects, calendars…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" aria-label="Search components">
                <ArrowRight size={19} />
              </button>
            </form>
            <div className="hero-shortcuts">
              <span>Popular</span>
              <a href={hrefs.assets + '?category=buttons&kind=component'}>Buttons</a>
              <a href={hrefs.assets + '?category=text&kind=component'}>Text effects</a>
              <a href={hrefs.assets + '?category=backgrounds&kind=component'}>Backgrounds</a>
            </div>
          </div>
        </section>
        <section className="ui8-feed" aria-labelledby="components-title">
          <h2 id="components-title" className="sr-only">
            Components
          </h2>
          <div className="ui8-switch" role="group" aria-label="Component shelf">
            {SHELVES.map((item) => (
              <button
                key={item.id}
                aria-pressed={shelf === item.id}
                onClick={() => setShelf(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="discovery-feature-grid">
            <a
              className="promo-card"
              href={`${hrefs.assets}?view=connect`}
              onClick={(e) => internal(e, () => navigateInApp(`${hrefs.assets}?view=connect`))}
            >
              <div className="promo-card-art">
                <span>For developers</span>
                <strong>Connect your AI agent</strong>
                <code>MCP · registry · source links</code>
              </div>
              <div className="card-heading">
                <span>UIXO for agents</span>
                <span className="card-price">Free</span>
              </div>
              <div className="card-byline">
                <span className="creator-avatar" aria-hidden="true">
                  U
                </span>
                <span className="creator-name">UIXO</span>
                <ChevronRight size={12} aria-hidden="true" />
                <span>Let your agent search the catalogue</span>
              </div>
            </a>
            {shelf === 'featured' ? (
              FEATURED_COMPONENTS.map((id) => <FeaturedComponent key={id} id={id} links={links} />)
            ) : (
              <ShelfComponents key={shelf} category={shelf} links={links} />
            )}
          </div>
          <a
            className="ui8-more"
            href={
              shelf === 'featured'
                ? hrefs.assets
                : `${hrefs.assets}?category=${shelf}&kind=component`
            }
            onClick={(e) => internal(e, onAssets)}
          >
            Explore all {catalogue ? catalogue.total.toLocaleString('en-GB') : ''} components{' '}
            <ArrowRight size={15} />
          </a>
        </section>
        <section className="home-websites" aria-labelledby="websites-title">
          <div className="discovery-section-heading">
            <div>
              <p className="discovery-kicker">Beyond components</p>
              <h2 id="websites-title">Libraries and sites worth a new tab.</h2>
            </div>
            <a
              className="discovery-viewall"
              href={hrefs.browse}
              onClick={(e) => internal(e, onBrowse)}
            >
              All {resources.length} resources <ArrowRight size={14} />
            </a>
          </div>
          <div className="discovery-feature-grid">
            {websites.map((item) => (
              <article key={item.id} className="discovery-product">
                <a
                  className="discovery-product-image"
                  href={hrefs.resource(item.id)}
                  onClick={(e) => internal(e, () => onOpenResource(item.id))}
                >
                  <Thumbnail
                    id={item.id}
                    alt={`${item.name} website screenshot`}
                    sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw"
                    onError={() => {}}
                  />
                  {item.addedOrder >= NEW_FROM && <span className="card-badge">New</span>}
                </a>
                <div className="card-heading">
                  <a
                    href={hrefs.resource(item.id)}
                    onClick={(e) => internal(e, () => onOpenResource(item.id))}
                  >
                    {item.name}
                  </a>
                  <span className="card-price">{item.pricing}</span>
                </div>
                <div className="card-byline">
                  <span className="creator-avatar" aria-hidden="true">
                    {item.creator.charAt(0)}
                  </span>
                  <span className="creator-name">{item.creator}</span>
                  <ChevronRight size={12} aria-hidden="true" />
                  <span>{item.category}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="discovery-collections" aria-labelledby="collections-title">
          <div className="discovery-section-heading">
            <div>
              <p className="discovery-kicker">Less searching. More making.</p>
              <h2 id="collections-title">A little direction goes a long way.</h2>
            </div>
            <a
              className="discovery-viewall"
              href={hrefs.collections}
              onClick={(e) => internal(e, onCollections)}
            >
              All collections <ArrowRight size={14} />
            </a>
          </div>
          <div className="discovery-collection-grid">
            {collections.slice(0, 3).map((item) => (
              <a
                className="discovery-collection"
                key={item.slug}
                href={hrefs.collection(item.slug)}
                onClick={(e) => internal(e, () => onOpenCollection(item.slug))}
              >
                <div className="collection-covers">
                  {item.resourceIds.slice(0, 3).map((id) => (
                    <img
                      key={id}
                      src={`/assets/${id}.png`}
                      alt=""
                      loading="lazy"
                      style={{ objectPosition: thumbnailPosition(id) }}
                    />
                  ))}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <ArrowUpRight size={17} />
                  <p>{item.tagline}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
        <SiteFooter count={null} />
      </main>
    </div>
  );
}
