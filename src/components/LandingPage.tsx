import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronRight, Search } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { Thumbnail } from './Thumbnail';
import { AssetPreview } from './AssetPreview';
import type { CollectionAssetPreview } from '../../shared/intelligence';
import './homepage.css';
import { DiscoveryHeader } from './discovery/DiscoveryHeader';
import { collections, resources, thumbnailPosition } from '../data';
import { navigateInApp } from '../lib/navigation';
import { newThreshold } from '../lib/freshness';
import { useRegistryData } from '../hooks/useRegistryData';
import type { RegistryStatus } from '../lib/asset-library';

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

// Use published records and the same original live demos as the asset catalogue.
const featuredComponents = [
  { id: 'shadcn/command', name: 'Command', provider: 'shadcn/ui' },
  { id: 'magic-ui/aurora-text', name: 'Aurora Text', provider: 'Magic UI' },
  { id: 'shadcn/calendar', name: 'Calendar', provider: 'shadcn/ui' },
];

function FeaturedComponent({
  item,
  href,
}: {
  item: (typeof featuredComponents)[number];
  href: string;
}) {
  const { data, error } = useRegistryData<CollectionAssetPreview>('asset', { id: item.id });
  return (
    <article className="home-component">
      {data ? (
        <AssetPreview asset={data} />
      ) : (
        <div className="home-preview-pending" role="status">
          {error ? 'Preview unavailable' : 'Loading component…'}
        </div>
      )}
      <a className="home-component-link" href={href}>
        <div>
          <h3>{item.name}</h3>
          <span>{item.provider}</span>
        </div>
        <ArrowUpRight size={18} />
      </a>
    </article>
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
}: LandingPageProps) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'featured' | 'new' | 'free'>('featured');
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: status } = useRegistryData<RegistryStatus>('status');
  const byRecency = [...resources].sort((a, b) => b.addedOrder - a.addedOrder);
  const picked =
    tab === 'featured'
      ? resources.filter((item) => item.featured)
      : tab === 'new'
        ? byRecency
        : byRecency.filter((item) => item.pricing === 'Free');
  // Eight cards plus the promo fill a three-by-three grid; top up with recent finds if short.
  const featured = [...picked, ...byRecency.filter((item) => !picked.includes(item))].slice(0, 8);
  const total = resources.length + (status?.stats?.assets ?? 0);
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
              {total.toLocaleString('en-GB')} hand-picked components and resources to speed up your
              next build.
            </h1>
            <p className="hero-description">
              Live previews, the original source one click away, and new finds every weekday.
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
                placeholder="What will you build next?"
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
              <a href={hrefs.assets + '?category=motion&kind=component'}>Motion</a>
              <a href={hrefs.browse} onClick={(e) => internal(e, onBrowse)}>
                UI libraries <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </section>
        <section className="ui8-feed" aria-labelledby="featured-title">
          <h2 id="featured-title" className="sr-only">
            Resources
          </h2>
          <div className="ui8-switch" role="group" aria-label="Featured resources order">
            <button aria-pressed={tab === 'featured'} onClick={() => setTab('featured')}>
              Featured
            </button>
            <button aria-pressed={tab === 'new'} onClick={() => setTab('new')}>
              New
            </button>
            <button aria-pressed={tab === 'free'} onClick={() => setTab('free')}>
              Free
            </button>
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
            {featured.map((item) => (
              <article key={item.id} className="discovery-product">
                <a
                  className="discovery-product-image"
                  href={hrefs.resource(item.id)}
                  onClick={(e) => internal(e, () => onOpenResource(item.id))}
                >
                  <Thumbnail
                    id={item.id}
                    alt={`${item.name} website screenshot`}
                    sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 25vw"
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
          <a className="ui8-more" href={hrefs.browse} onClick={(e) => internal(e, onBrowse)}>
            Explore all {resources.length} resources <ArrowRight size={15} />
          </a>
        </section>
        <section className="home-showcase" aria-labelledby="showcase-title">
          <div className="home-showcase-heading">
            <div>
              <p className="discovery-kicker">A few good details</p>
              <h2 id="showcase-title">Try something great.</h2>
            </div>
            <a
              className="discovery-viewall"
              href={hrefs.assets}
              onClick={(e) => internal(e, onAssets)}
            >
              All assets <ArrowRight size={14} />
            </a>
          </div>
          <div className="home-component-grid">
            {featuredComponents.map((item) => (
              <FeaturedComponent
                key={item.id}
                item={item}
                href={`${hrefs.assets}?id=${encodeURIComponent(item.id)}`}
              />
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
