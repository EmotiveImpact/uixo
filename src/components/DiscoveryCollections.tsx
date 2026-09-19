import { ArrowRight, Terminal } from 'lucide-react';
import type { PublicCollection } from '../../shared/intelligence';
import { useRegistryData } from '../hooks/useRegistryData';
import { AssetPreview } from './AssetPreview';
import { RegistryLink, type IntelligenceProps } from './RegistryPrimitives';
import './discovery-v2.css';

type Navigation = Pick<IntelligenceProps, 'query' | 'navigate'>;

export function CollectionVisual({ collection }: { collection: PublicCollection }) {
  const cover = collection.items.find((item) => item.asset)?.asset;
  return (
    <div className="dv2-collection-visual">
      {cover ? (
        <AssetPreview asset={cover} />
      ) : (
        <div className="dv2-collection-no-media">
          <span>CURATED SOURCES</span>
          <strong>{collection.items.map((item) => item.name).slice(0, 3).join(' / ')}</strong>
          <small>No component preview is available for this selection.</small>
        </div>
      )}
    </div>
  );
}

export function CollectionGrid({
  items,
  query,
  navigate,
  compact = false,
}: Navigation & { items: PublicCollection[]; compact?: boolean }) {
  return (
    <div className={'dv2-collections' + (compact ? ' is-compact' : '')}>
      {items.map((collection) => {
        const sources = [...new Set(collection.items.flatMap((item) =>
          item.providerName ? [item.providerName] : item.kind === 'provider' ? [item.name] : [],
        ))];
        const frameworks = [...new Set(collection.items.flatMap((item) => item.frameworks ?? []))];
        return (
          <article className="dv2-collection-card" key={collection.slug}>
            <CollectionVisual collection={collection} />
            <div className="dv2-collection-copy">
              <div className="dv2-card-meta">
                <span>{collection.items.length} available items</span>
                {frameworks.length > 0 && <span>{frameworks.join(' / ')}</span>}
              </div>
              <h3>
                <RegistryLink
                  query={query}
                  navigate={navigate}
                  changes={{ view: 'collections', collection: collection.slug }}
                >
                  {collection.title} <ArrowRight size={16} aria-hidden="true" />
                </RegistryLink>
              </h3>
              <p>{collection.description}</p>
              {sources.length > 0 && <small className="dv2-source-line">From {sources.join(' + ')}</small>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function FeaturedCollections({ query, navigate }: Navigation) {
  const remote = useRegistryData<{ items: PublicCollection[]; total: number }>('collections', { limit: '3' });
  return (
    <section className="discovery-featured" aria-label="Featured asset collections">
      <div className="dv2-section-heading">
        <div>
          <span className="dv2-eyebrow">A BETTER STARTING POINT</span>
          <h2>Build from a considered selection.</h2>
        </div>
        <RegistryLink query={query} navigate={navigate} changes={{ view: 'collections' }}>
          All collections <ArrowRight size={15} aria-hidden="true" />
        </RegistryLink>
      </div>
      {remote.loading ? (
        <p role="status" className="dv2-muted">Loading editorial collections…</p>
      ) : remote.error ? (
        <div className="dv2-inline-state">
          <p>Collections are unavailable. Asset browsing remains available below.</p>
          <button onClick={remote.reload}>Retry collections</button>
        </div>
      ) : remote.data?.items.length ? (
        <CollectionGrid items={remote.data.items} query={query} navigate={navigate} compact />
      ) : (
        <div className="dv2-inline-state">
          <p>Editorial collections are being prepared. Explore the approved sources meanwhile.</p>
          <RegistryLink query={query} navigate={navigate} changes={{ view: 'sources' }}>
            Explore sources <ArrowRight size={15} aria-hidden="true" />
          </RegistryLink>
        </div>
      )}
      <div className="dv2-agent-entry">
        <Terminal size={19} aria-hidden="true" />
        <p><strong>The same library, in your coding workflow.</strong> Search and inspect UIXO through MCP.</p>
        <RegistryLink query={query} navigate={navigate} changes={{ view: 'connect' }}>
          Connect your agent <ArrowRight size={15} aria-hidden="true" />
        </RegistryLink>
      </div>
    </section>
  );
}
