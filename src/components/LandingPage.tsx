import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { Thumbnail } from './Thumbnail';
import { collections, resources, thumbnailPosition } from '../data';
import type { Resource } from '../types';

type LandingPageProps = {
  authAvailable: boolean;
  signedIn: boolean;
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

function internal(handler: () => void) {
  return (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    handler();
  };
}

function FeatureCard({
  resource,
  href,
  onOpen,
}: {
  resource: Resource;
  href: string;
  onOpen: (id: string) => void;
}) {
  return (
    <article className="landing-product-card">
      <a
        className="landing-thumb"
        href={href}
        onClick={internal(() => onOpen(resource.id))}
        aria-label={`Open details for ${resource.name}`}
      >
        <Thumbnail
          id={resource.id}
          alt={`${resource.name} website preview`}
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          onError={() => undefined}
        />
      </a>
      <div className="landing-product-copy">
        <div>
          <a className="landing-name" href={href} onClick={internal(() => onOpen(resource.id))}>
            {resource.name}
          </a>
          <p className="landing-meta">
            {resource.creator} · <span>{resource.pricing}</span>
          </p>
        </div>
        <ArrowUpRight size={15} aria-hidden="true" />
      </div>
    </article>
  );
}

export function LandingPage({
  authAvailable,
  signedIn,
  hrefs,
  onBrowse,
  onAssets,
  onCollections,
  onOpenCollection,
  onOpenResource,
  onSignIn,
  onAbout,
}: LandingPageProps) {
  const heroItems = resources.filter((resource) => resource.featured).slice(0, 5);
  const visualItems = (heroItems.length >= 4 ? heroItems : resources.slice(0, 5)).slice(0, 5);
  const featured = resources.filter((resource) => resource.featured).slice(0, 6);

  return (
    <div className="landing landing-v3">
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="brand landing-brand" href="/" aria-label="UIXO home">
            UIXO
          </a>

          <span className="landing-links">
            <a href={hrefs.browse} onClick={internal(onBrowse)}>
              Discover
            </a>
            <a href={hrefs.assets} onClick={internal(onAssets)}>
              Components
            </a>
            <a href={hrefs.browse} onClick={internal(onBrowse)}>
              Resources
            </a>
            <a href={hrefs.collections} onClick={internal(onCollections)}>
              Collections
            </a>
          </span>

          <span className="landing-nav-right">
            <button className="ghost" onClick={onAbout}>
              About
            </button>
            {authAvailable && !signedIn && (
              <button className="ghost" onClick={onSignIn}>
                Sign in
              </button>
            )}
            <a className="solid" href={hrefs.assets} onClick={internal(onAssets)}>
              Explore UIXO
            </a>
          </span>
        </nav>

        <header className="landing-hero landing-hero-v3">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">DISCOVER · BUILD · SHIP</p>
            <h1>
              The interface
              <br />
              starts here.
            </h1>
            <p className="landing-lede">
              A curated universe of UI components, libraries, icons, templates and design resources
              from the world’s best creators — built for designers, developers and AI.
            </p>

            <a className="landing-search-cta" href={hrefs.assets} onClick={internal(onAssets)}>
              <Search size={17} />
              <span>Search components, libraries, icons and templates…</span>
              <kbd>⌘ K</kbd>
            </a>

            <div className="landing-facts landing-facts-v3">
              <span>
                <b>{resources.length}+</b>
                resources
              </span>
              <span>
                <b>{collections.length}</b>
                curated collections
              </span>
              <span>
                <b>Source-backed</b>
                component registry
              </span>
            </div>
          </div>

          <div className="landing-visual" aria-label="A selection of UIXO resources">
            <div className="landing-visual-glow" aria-hidden="true" />
            {visualItems.map((resource, index) => (
              <a
                key={resource.id}
                className={`landing-float-card landing-float-${index + 1}`}
                href={hrefs.resource(resource.id)}
                onClick={internal(() => onOpenResource(resource.id))}
                aria-label={`Open ${resource.name}`}
              >
                <Thumbnail
                  id={resource.id}
                  alt=""
                  sizes="280px"
                  eager={index < 2}
                  onError={() => undefined}
                />
                <span>
                  <strong>{resource.name}</strong>
                  <small>{resource.category}</small>
                </span>
              </a>
            ))}
          </div>
        </header>

        <section
          className="landing-section landing-discovery-strip"
          aria-labelledby="landing-featured"
        >
          <div className="landing-tabs" role="presentation">
            <span className="selected">Curated</span>
            <span>New</span>
            <span>Popular</span>
            <span>For you</span>
          </div>

          <div className="landing-head">
            <div>
              <p className="landing-eyebrow">THIS WEEK</p>
              <h2 id="landing-featured">Featured interfaces</h2>
              <p>Useful things with taste. No filler.</p>
            </div>
            <a className="landing-viewall" href={hrefs.browse} onClick={internal(onBrowse)}>
              View all <ArrowRight size={13} />
            </a>
          </div>

          <div className="landing-grid landing-product-grid">
            {featured.map((resource) => (
              <FeatureCard
                key={resource.id}
                resource={resource}
                href={hrefs.resource(resource.id)}
                onOpen={onOpenResource}
              />
            ))}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="landing-collections">
          <div className="landing-head">
            <div>
              <p className="landing-eyebrow">CURATED SETS</p>
              <h2 id="landing-collections">Collections with a point of view</h2>
              <p>Explore by intent instead of hunting through noise.</p>
            </div>
            <a
              className="landing-viewall"
              href={hrefs.collections}
              onClick={internal(onCollections)}
            >
              View all <ArrowRight size={13} />
            </a>
          </div>

          <div className="landing-grid landing-collection-grid">
            {collections.slice(0, 3).map((collection) => {
              const covers = collection.resourceIds
                .map((id) => resources.find((entry) => entry.id === id))
                .filter((entry): entry is Resource => Boolean(entry))
                .slice(0, 4);

              return (
                <a
                  key={collection.slug}
                  className="landing-collection"
                  href={hrefs.collection(collection.slug)}
                  onClick={internal(() => onOpenCollection(collection.slug))}
                >
                  <span className="landing-covers" aria-hidden="true">
                    {covers.map((resource) => (
                      <img
                        key={resource.id}
                        src={`/assets/${resource.id}.png`}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: thumbnailPosition(resource.id) }}
                      />
                    ))}
                  </span>
                  <span className="landing-collection-copy">
                    <span>
                      <strong>{collection.name}</strong>
                      <small>{collection.tagline}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="landing-handoff">
          <div>
            <p className="landing-eyebrow">THE REGISTRY UNDERNEATH</p>
            <h2>Browse beautifully. Build with confidence.</h2>
            <p>
              UIXO keeps the useful technical detail — source, licence, framework and install path —
              behind a visual discovery experience that stays fast and clean.
            </p>
          </div>
          <a className="solid" href={hrefs.assets} onClick={internal(onAssets)}>
            Explore components <ArrowRight size={15} />
          </a>
        </section>

        <SiteFooter count={null} />
      </div>
    </div>
  );
}
