import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import type { SourceDirectoryResult } from '../../shared/source-directory';
import { safeAssetUrl } from '../lib/asset-library';
import { useRegistryData } from '../hooks/useRegistryData';
import { RegistryLink, RegistryState, type IntelligenceProps } from './RegistryPrimitives';
import './discovery-v2.css';

export function SourceDirectory({ query, navigate }: IntelligenceProps) {
  const pageSize = 12;
  const remote = useRegistryData<SourceDirectoryResult>('source-directory', {
    q: query.q,
    offset: String(query.offset),
    limit: String(pageSize),
  });
  const sources = remote.data?.items ?? [];
  const total = remote.data?.total ?? sources.length;
  return (
    <>
      <div className="ri-heading">
        <div>
          <span className="ri-eyebrow">SOURCE INTELLIGENCE</span>
          <h2>Understand the source, not just the count.</h2>
          <p>The original libraries. Their indexed assets. The evidence behind them.</p>
        </div>
      </div>
      <div className="dv2-source-controls">
        <label>
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Find a source"
            placeholder="Find a source, framework or licence"
            value={query.q}
            maxLength={120}
            onChange={(event) => navigate({ q: event.target.value, offset: 0 })}
            type="search"
          />
        </label>
        <span role="status">
          {remote.loading ? 'Updating sources…' : `${sources.length} of ${total} sources`}
        </span>
      </div>
      <RegistryState {...remote}>
        {!sources.length ? (
          query.q || query.offset ? (
            <div className="dv2-inline-state">
              <p>No sources match this search or page.</p>
              <button onClick={() => navigate({ q: '', offset: 0 })}>Clear source search</button>
            </div>
          ) : (
            <p>No approved sources are available.</p>
          )
        ) : (
          <div className="dv2-sources">
            {sources.map((source) => {
              const metrics = source.metrics;
              const count = source.assetCount ?? metrics?.total ?? 0;
              const previewed = metrics
                ? Math.max(0, metrics.total - metrics.missingPreviews)
                : null;
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
                    <strong>{count}</strong>
                    <span>indexed assets</span>
                  </div>
                  <div className="ri-tags">
                    {[...new Set([...source.frameworks, ...source.licences])].map((value) => (
                      <span className="ri-tag" key={value}>
                        {value}
                      </span>
                    ))}
                  </div>
                  {metrics ? (
                    <dl className="dv2-source-evidence">
                      <div>
                        <dt>Preview evidence</dt>
                        <dd>
                          {previewed}/{count}
                        </dd>
                      </div>
                      <div>
                        <dt>Pinned sources</dt>
                        <dd>
                          {metrics.sourcePinned}/{count}
                        </dd>
                      </div>
                      <div>
                        <dt>Licence evidence</dt>
                        <dd>
                          {metrics.licenceEvidence}/{count}
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
                  ) : (
                    <p className="dv2-evidence-footnote">{source.evidenceNote}</p>
                  )}
                  <div className="dv2-source-actions">
                    <RegistryLink
                      query={query}
                      navigate={navigate}
                      changes={{ view: 'sources', provider: source.id }}
                    >
                      View evidence <ArrowRight size={15} aria-hidden="true" />
                    </RegistryLink>
                    <RegistryLink
                      query={query}
                      navigate={navigate}
                      changes={{ provider: source.id }}
                    >
                      Browse assets
                    </RegistryLink>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {(query.offset > 0 || remote.data?.nextOffset != null) && (
          <nav className="ri-actions" aria-label="Source pages">
            <button
              disabled={query.offset === 0}
              onClick={() => navigate({ offset: Math.max(0, query.offset - pageSize) })}
            >
              <ArrowLeft size={15} aria-hidden="true" /> Previous sources
            </button>
            <button
              disabled={remote.data?.nextOffset == null}
              onClick={() => navigate({ offset: remote.data?.nextOffset ?? 0 })}
            >
              Next sources <ArrowRight size={15} aria-hidden="true" />
            </button>
          </nav>
        )}
      </RegistryState>
      <p className="dv2-evidence-footnote">
        These are retained registry observations, not live upstream checks or a guarantee of
        accessibility, security or project compatibility. Detailed evidence is only shown when the
        complete source fits this request's analysis budget; it is never sampled.
      </p>
    </>
  );
}
