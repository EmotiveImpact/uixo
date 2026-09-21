import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { Thumbnail } from './Thumbnail';
import { DiscoveryHeader } from './discovery/DiscoveryHeader';
import { collections, resources, thumbnailPosition } from '../data';
import { navigateInApp } from '../lib/navigation';
import { useRegistryData } from '../hooks/useRegistryData';
import type { RegistryStatus } from '../lib/asset-library';

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

// Real retained component captures, not generated artwork or invented Kibo components.
const heroCaptures = [
  { id: 'shadcn/command', name: 'Command', provider: 'shadcn/ui' },
  { id: 'shadcn/calendar', name: 'Calendar', provider: 'shadcn/ui' },
  { id: 'magic-ui/aurora-text', name: 'Aurora Text', provider: 'Magic UI' },
  { id: 'shadcn/button', name: 'Button', provider: 'shadcn/ui' },
];

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
  const [tab, setTab] = useState<'curated' | 'new'>('curated');
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: status } = useRegistryData<RegistryStatus>('status');
  const featured =
    tab === 'curated'
      ? resources.filter((item) => item.featured).slice(0, 8)
      : [...resources].sort((a, b) => b.addedOrder - a.addedOrder).slice(0, 8);
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
        light={light}
        onToggleTheme={onToggleTheme}
        onSearch={() => searchRef.current?.focus()}
        account={
          authAvailable && !signedIn ? (
            <button className="header-signin" onClick={onSignIn}>
              Sign in
            </button>
          ) : (
            <a className="header-signin" href={hrefs.assets} onClick={(e) => internal(e, onAssets)}>
              Explore UIXO
            </a>
          )
        }
      />
      <main className="discovery-container">
        <section className="discovery-hero">
          <div className="hero-copy">
            <p className="discovery-kicker">BETTER INTERFACES. A BRIGHTER INTERNET.</p>
            <h1>
              The interface
              <br />
              <span>starts here.</span>
            </h1>
            <p className="hero-description">
              Discover exceptional components, libraries and design resources. Find your next idea.
              Make it yours.
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
              <span>Explore</span>
              <a href={hrefs.assets + '?category=buttons&kind=component'}>Buttons</a>
              <a href={hrefs.assets + '?category=motion&kind=component'}>Motion</a>
              <a href={hrefs.browse} onClick={(e) => internal(e, onBrowse)}>
                UI libraries <ArrowUpRight size={11} />
              </a>
            </div>
            <div className="hero-stats">
              {status?.stats && (
                <span>
                  <strong>{status.stats.assets}</strong>{' '}
                  {status.readOnly ? 'preview assets' : 'catalogue assets'}
                </span>
              )}
              <span>
                <strong>{resources.length}</strong> resources
              </span>
              <span>
                <strong>{collections.length}</strong> collections
              </span>
            </div>
          </div>
          <div className="hero-stage" aria-label="Actual component screenshots">
            <div className="hero-stage-glow" aria-hidden="true" />
            <div className="hero-orbit" aria-hidden="true" />
            {heroCaptures.map((item, i) => (
              <a
                key={item.id}
                className={`hero-component hero-component-${i + 1}`}
                href={`${hrefs.assets}?id=${encodeURIComponent(item.id)}`}
              >
                <div className="hero-component-caption">
                  <span>{item.provider}</span>
                  <ArrowUpRight size={12} />
                </div>
                <img
                  src={`/assets/component-previews/${item.id}.webp`}
                  alt={`${item.name} upstream screenshot`}
                  width={638}
                  height={384}
                />
                <div className="hero-component-footer">
                  <strong>{item.name}</strong>
                  <span>Screenshot</span>
                </div>
              </a>
            ))}
            <span className="hero-stage-note">REAL COMPONENTS. ENDLESS POSSIBILITIES.</span>
          </div>
        </section>
        <section className="discovery-feature-section" aria-labelledby="featured-title">
          <div className="discovery-section-bar">
            <div className="discovery-feed-tabs" role="group" aria-label="Featured resources order">
              <button aria-pressed={tab === 'curated'} onClick={() => setTab('curated')}>
                Curated
              </button>
              <button aria-pressed={tab === 'new'} onClick={() => setTab('new')}>
                New additions
              </button>
              <a href={hrefs.collections} onClick={(e) => internal(e, onCollections)}>
                Collections
              </a>
            </div>
            <a
              className="discovery-viewall"
              href={hrefs.browse}
              onClick={(e) => internal(e, onBrowse)}
            >
              Explore everything <ArrowRight size={14} />
            </a>
          </div>
          <div className="discovery-section-heading">
            <h2 id="featured-title">
              {tab === 'curated'
                ? 'Good design. Great starting points.'
                : 'Fresh finds for your next project.'}
            </h2>
            <p>A few things worth opening a new tab for.</p>
          </div>
          <div className="discovery-feature-grid">
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
                  <span className="product-type">Resource</span>
                </a>
                <div className="discovery-product-title">
                  <a
                    href={hrefs.resource(item.id)}
                    onClick={(e) => internal(e, () => onOpenResource(item.id))}
                  >
                    {item.name}
                  </a>
                  <a
                    aria-label={`Visit ${item.name}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowUpRight size={15} />
                  </a>
                </div>
                <p>
                  {item.creator}
                  <span>{item.pricing}</span>
                </p>
                <div className="discovery-product-tags">
                  <span>{item.category}</span>
                  <span>{item.formats[0]}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="discovery-collections" aria-labelledby="collections-title">
          <div className="discovery-section-heading">
            <div>
              <p className="discovery-kicker">LESS SEARCHING. MORE MAKING.</p>
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
        <section className="discovery-handoff">
          <div>
            <p className="discovery-kicker">FROM INSPIRATION TO IMPLEMENTATION</p>
            <h2>Find it. Try it. Build with it.</h2>
            <p>The original source and installation details, always one click away.</p>
          </div>
          <a href={hrefs.assets} onClick={(e) => internal(e, onAssets)}>
            Explore components <ArrowRight size={16} />
          </a>
        </section>
        <SiteFooter count={null} />
      </main>
    </div>
  );
}
