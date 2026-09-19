import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import type { SourceHealth } from '../../shared/intelligence';
import { safeAssetUrl } from '../lib/asset-library';
import { useRegistryData } from '../hooks/useRegistryData';
import { RegistryLink, RegistryState, type IntelligenceProps } from './RegistryPrimitives';
import './discovery-v2.css';

export function SourceDirectory({ query, navigate }: IntelligenceProps) {
  const remote = useRegistryData<{ items: SourceHealth[] }>('source-directory');
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const sources = remote.data?.items ?? [];
  const matches = sources.filter((source) =>
    [source.name, source.url, ...source.frameworks, ...source.licences]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
  return (
    <RegistryState {...remote}>
      <div className="ri-heading">
        <div>
          <span className="ri-eyebrow">SOURCE INTELLIGENCE</span>
          <h2>Understand the source, not just the count.</h2>
          <p>The original libraries. Their indexed assets. The evidence behind them.</p>
        </div>
      </div>
      {sources.length > 0 && (
        <div className="dv2-source-controls">
          <label>
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Find a source"
              placeholder="Find a source, framework or licence"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
            />
          </label>
          <span role="status">
            {matches.length} of {sources.length} sources
          </span>
        </div>
      )}
      {!sources.length ? (
        <p>No approved sources are available.</p>
      ) : !matches.length ? (
        <div className="dv2-inline-state">
          <p>No sources match this search.</p>
          <button onClick={() => setSearch('')}>Clear source search</button>
        </div>
      ) : (
        <div className="dv2-sources">
          {matches.map((source) => {
            const previewed = Math.max(0, source.metrics.total - source.metrics.missingPreviews);
            return (
              <article className="dv2-source-card" key={source.id}>
                <div className="dv2-source-identity">
                  <span className="dv2-source-monogram" aria-hidden="true">
                    {source.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3>{source.name}</h3>
                    <a href={safeAssetUrl(source.url)} target="_blank" rel="noopener noreferrer">
                      Original library <ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  </div>
                </div>
                <p className="dv2-source-description">{source.rationale}</p>
                <div className="dv2-source-count">
                  <strong>{source.metrics.total}</strong>
                  <span>indexed assets</span>
                </div>
                <div className="ri-tags">
                  {[...new Set([...source.frameworks, ...source.licences])].map((value) => (
                    <span className="ri-tag" key={value}>
                      {value}
                    </span>
                  ))}
                </div>
                <dl className="dv2-source-evidence">
                  <div>
                    <dt>Preview evidence</dt>
                    <dd>
                      {previewed}/{source.metrics.total}
                    </dd>
                  </div>
                  <div>
                    <dt>Pinned sources</dt>
                    <dd>
                      {source.metrics.sourcePinned}/{source.metrics.total}
                    </dd>
                  </div>
                  <div>
                    <dt>Licence evidence</dt>
                    <dd>
                      {source.metrics.licenceEvidence}/{source.metrics.total}
                    </dd>
                  </div>
                  <div>
                    <dt>Last recorded verification</dt>
                    <dd>
                      {source.newestVerifiedAt
                        ? new Date(source.newestVerifiedAt).toLocaleDateString('en-GB')
                        : 'Not recorded'}
                    </dd>
                  </div>
                </dl>
                <div className="dv2-source-actions">
                  <RegistryLink
                    query={query}
                    navigate={navigate}
                    changes={{ view: 'sources', provider: source.id }}
                  >
                    View evidence <ArrowRight size={15} aria-hidden="true" />
                  </RegistryLink>
                  <RegistryLink query={query} navigate={navigate} changes={{ provider: source.id }}>
                    Browse assets
                  </RegistryLink>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="dv2-evidence-footnote">
        These are retained registry observations, not live upstream checks or a guarantee of
        accessibility, security or project compatibility.
      </p>
    </RegistryState>
  );
}
