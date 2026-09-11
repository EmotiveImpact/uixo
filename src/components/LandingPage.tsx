import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Copyright } from './Copyright';
import { EditorPick } from './EditorPick';
import { MadeIn } from './MadeIn';
import { Thumbnail } from './Thumbnail';
import { collections, resources, thumbnailPosition } from '../data';
import { editorPick } from '../data';
import type { Resource } from '../types';

type LandingPageProps = {
  authAvailable: boolean;
  signedIn: boolean;
  hrefs: {
    browse: string;
    collections: string;
    collection: (slug: string) => string;
    resource: (id: string) => string;
  };
  onBrowse: () => void;
  onCollections: () => void;
  onOpenCollection: (slug: string) => void;
  onOpenResource: (id: string) => void;
  onSignIn: () => void;
  onAbout: () => void;
};

/** Intercept in-app navigation without breaking middle-click or the crawler's href. */
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
    <article>
      <a
        className="landing-thumb"
        href={href}
        onClick={internal(() => onOpen(resource.id))}
        aria-label={`Open details for ${resource.name}`}
      >
        <Thumbnail
          id={resource.id}
          alt={`${resource.name} website preview`}
          sizes="(max-width: 900px) 100vw, 33vw"
          onError={() => undefined}
        />
      </a>
      <a className="landing-name" href={href} onClick={internal(() => onOpen(resource.id))}>
        {resource.name}
      </a>
      <p className="landing-desc">{resource.description}</p>
      <p className="landing-meta">
        by {resource.creator} ·{' '}
        <span className={`pricing-${resource.pricing.toLowerCase()}`}>{resource.pricing}</span>
      </p>
    </article>
  );
}

/**
 * The front door. Deliberately renders without the sidebar and topbar: this page's job is
 * to say what UIXO is, the app's job is to help you find things. Mixing the two was what
 * made the earlier single-surface layouts feel wrong.
 */
export function LandingPage({
  authAvailable,
  signedIn,
  hrefs,
  onBrowse,
  onCollections,
  onOpenCollection,
  onOpenResource,
  onSignIn,
  onAbout,
}: LandingPageProps) {
  // The pick headlines the page, so it should not also lead the Featured row.
  const featured = resources
    .filter((resource) => resource.featured && resource.id !== editorPick.resourceId)
    .slice(0, 3);

  const lastChecked = resources
    .map((resource) => resource.lastChecked)
    .sort()
    .at(-1);

  return (
    <div className="landing">
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="brand" href="/" aria-label="UIXO home">
            UIXO
          </a>
          <span className="landing-links">
            <a href={hrefs.browse} onClick={internal(onBrowse)}>
              Explore
            </a>
            <a href={hrefs.collections} onClick={internal(onCollections)}>
              Collections
            </a>
            <button onClick={onAbout}>About</button>
          </span>
          <span className="landing-nav-right">
            {!authAvailable ? (
              <a className="solid" href={hrefs.browse} onClick={internal(onBrowse)}>
                Browse the directory
              </a>
            ) : signedIn ? (
              <a className="solid" href={hrefs.browse} onClick={internal(onBrowse)}>
                Open the directory
              </a>
            ) : (
              <>
                <button className="ghost" onClick={onSignIn}>
                  Sign in
                </button>
                <button className="solid" onClick={onSignIn}>
                  Join
                </button>
              </>
            )}
          </span>
        </nav>

        <header className="landing-hero">
          <p className="landing-eyebrow">A hand-checked directory</p>
          <h1>
            Good tools.
            <br />
            <span>Great interfaces.</span>
          </h1>
          <p className="landing-lede">
            A small collection of the resources we actually reach for — components, icons,
            backgrounds and type. Every one chosen by hand, and checked by hand.
          </p>
          <div className="landing-cta">
            <a className="solid" href={hrefs.browse} onClick={internal(onBrowse)}>
              Browse the directory <ArrowRight size={15} />
            </a>
            <p className="landing-facts">
              <span>
                <b>{resources.length}</b> websites
              </span>
              <span>
                <b>{collections.length}</b> collections
              </span>
              {lastChecked && (
                <span>
                  Checked{' '}
                  <b>
                    {new Date(`${lastChecked}T00:00:00Z`).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </b>
                </span>
              )}
            </p>
          </div>
        </header>

        <EditorPick onOpen={onOpenResource} href={hrefs.resource(editorPick.resourceId)} />

        <section className="landing-section" aria-labelledby="landing-featured">
          <div className="landing-head">
            <div>
              <h2 id="landing-featured">Featured</h2>
              <p>Curated picks — the ones we reach for most.</p>
            </div>
            <a className="landing-viewall" href={hrefs.browse} onClick={internal(onBrowse)}>
              View all <ArrowRight size={13} />
            </a>
          </div>
          <div className="landing-grid">
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
              <h2 id="landing-collections">Collections</h2>
              <p>Curated sets with a point of view.</p>
            </div>
            <a
              className="landing-viewall"
              href={hrefs.collections}
              onClick={internal(onCollections)}
            >
              View all <ArrowRight size={13} />
            </a>
          </div>
          <div className="landing-grid">
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
                  <h3>
                    {collection.name} <ArrowUpRight size={15} />
                  </h3>
                  <p>{collection.tagline}</p>
                </a>
              );
            })}
          </div>
        </section>

        <section className="landing-handoff">
          <div>
            <h2>The whole collection.</h2>
            <p>
              Filter by category, format and pricing, save what you like into lists, and search by
              what a thing is for.
            </p>
          </div>
          <a className="solid" href={hrefs.browse} onClick={internal(onBrowse)}>
            Open the directory <ArrowRight size={15} />
          </a>
        </section>

        <footer className="landing-footer">
          <span className="footer-group">
            <span>UIXO</span>
            <span>Handpicked, not scraped.</span>
          </span>
          <span className="footer-group">
            <MadeIn />
            <Copyright />
          </span>
        </footer>
      </div>
    </div>
  );
}
