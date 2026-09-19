import { SourceDirectory } from './SourceDirectory';
import { ArrowLeft, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { safeAssetUrl } from '../lib/asset-library';
import type { AssetQuery } from '../lib/asset-library';
import type { CoverageReport, SourceHealth } from '../../shared/intelligence';
import { RegistryOperations } from './RegistryOperations';
import { AssetCollections } from './AssetCollections';
import {
  RegistryLink,
  RegistryState,
  EvidenceCards,
  type IntelligenceProps,
} from './RegistryPrimitives';
import { useRegistryData } from '../hooks/useRegistryData';
import './registry-intelligence.css';

function Health({ query, navigate }: IntelligenceProps) {
  const remote = useRegistryData<CoverageReport>('coverage', {}, true);
  const data = remote.data;
  return (
    <RegistryState {...remote}>
      {data && (
        <>
          <div className="ri-heading">
            <div>
              <span className="ri-eyebrow">REGISTRY HEALTH</span>
              <h2>Know what is in the library.</h2>
              <p>Measured from published records. No upstream availability check is implied.</p>
            </div>
            <button onClick={remote.reload}>
              <RefreshCw size={15} /> Refresh report
            </button>
          </div>
          <div className="ri-overview">
            <div>
              <strong>{data.metrics.total}</strong>
              <span>Published assets</span>
            </div>
            <div>
              <strong>{data.sources.length}</strong>
              <span>Approved sources</span>
            </div>
            <div>
              <strong>{data.metrics.stale + data.metrics.unknown}</strong>
              <span>Stale or undated</span>
            </div>
          </div>
          <EvidenceCards metrics={data.metrics} />
          <div className="ri-two-columns">
            <section>
              <h3>Category coverage</h3>
              <p className="ri-muted">
                Thin means fewer than {data.policy.thinCategoryBelow} assets. This is a coverage
                threshold, not a quality rating.
              </p>
              <div className="ri-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Assets</th>
                      <th>Sources</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <RegistryLink
                            query={query}
                            navigate={navigate}
                            changes={{ kind: 'component', category: c.id }}
                          >
                            {c.label}
                          </RegistryLink>
                        </td>
                        <td>{c.assets}</td>
                        <td>{c.providers}</td>
                        <td>
                          <span className="ri-tag">{c.state}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h3>Next investigation priorities</h3>
              <p className="ri-muted">
                Evidence gaps to investigate. Nothing here queues or publishes work automatically.
              </p>
              {data.gaps
                .filter((g) => g.count > 0 || g.code.startsWith('category-'))
                .map((g) => (
                  <div className="ri-gap" key={g.code + (g.providerId || '')}>
                    <div>
                      <strong>{g.label}</strong>
                      {g.providerId && (
                        <RegistryLink
                          query={query}
                          navigate={navigate}
                          changes={{ view: 'sources', provider: g.providerId }}
                        >
                          Inspect source <ArrowRight size={13} />
                        </RegistryLink>
                      )}
                    </div>
                    <span>{g.count}</span>
                  </div>
                ))}
            </section>
          </div>
          <section className="ri-section">
            <h3>Freshness and media</h3>
            <p>
              {data.metrics.fresh} fresh · {data.metrics.ageing} ageing · {data.metrics.stale} stale
              · {data.metrics.unknown} unknown
            </p>
            <p className="ri-muted">
              Fresh: up to {data.policy.freshDays} days. Stale: older than {data.policy.staleDays}{' '}
              days. Age does not establish that a source has changed.
            </p>
            <p>
              {data.metrics.officialCaptures} official captures · {data.metrics.pinnedLiveDemos}{' '}
              pinned live demos · {data.metrics.upstreamImages} other image references
            </p>
            <p className="ri-muted">
              A record can have both a capture and a live demo. These figures are not additive.
            </p>
          </section>
          {data.duplicateSources.length > 0 && (
            <section className="ri-section">
              <h3>Shared source locators</h3>
              <p className="ri-muted">
                Potential overlap to review, not proof of duplicate assets.
              </p>
              {data.duplicateSources.map((group) => (
                <details key={group.sourceUrl}>
                  <summary>{group.assetIds.length} assets share a source</summary>
                  <p>{group.sourceUrl}</p>
                  <p>{group.assetIds.join(', ')}</p>
                </details>
              ))}
            </section>
          )}
          <p className="ri-muted">
            Report generated {new Date(data.generatedAt).toLocaleString('en-GB')}.
          </p>
        </>
      )}
    </RegistryState>
  );
}
function Sources(props: IntelligenceProps) {
  return props.query.provider ? <SourceProfile {...props} /> : <SourceDirectory {...props} />;
}
function SourceProfile({ query, navigate, isCurator }: IntelligenceProps) {
  const remote = useRegistryData<SourceHealth>('source-health', { provider: query.provider });
  const s = remote.data;
  return (
    <>
      <RegistryLink query={query} navigate={navigate} changes={{ view: 'sources' }}>
        <ArrowLeft size={14} /> All sources
      </RegistryLink>
      <RegistryState {...remote}>
        {s && (
          <>
            <div className="ri-heading">
              <div>
                <span className="ri-eyebrow">SOURCE PROFILE</span>
                <h2>{s.name}</h2>
                <p>{s.rationale}</p>
              </div>
              <RegistryLink query={query} navigate={navigate} changes={{ provider: s.id }}>
                Browse {s.metrics.total} assets <ArrowRight size={15} />
              </RegistryLink>
            </div>
            <div className="ri-tags">
              {[...s.frameworks, ...s.formats, ...s.licences].map((t) => (
                <span key={t} className="ri-tag">
                  {t}
                </span>
              ))}
            </div>
            <EvidenceCards metrics={s.metrics} />
            <section className="ri-section">
              <h3>What the evidence does, and does not, establish</h3>
              <dl className="ri-facts">
                <div>
                  <dt>Oldest verification</dt>
                  <dd>
                    {s.oldestVerifiedAt
                      ? new Date(s.oldestVerifiedAt).toLocaleDateString('en-GB')
                      : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt>Latest verification</dt>
                  <dd>
                    {s.newestVerifiedAt
                      ? new Date(s.newestVerifiedAt).toLocaleDateString('en-GB')
                      : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt>Upstream changes</dt>
                  <dd>Not checked by this report</dd>
                </div>
                <div>
                  <dt>Runtime compatibility</dt>
                  <dd>Not certified</dd>
                </div>
              </dl>
              <p className="ri-muted">
                Source approval is an editorial decision. It is not a guarantee of safety,
                accessibility or fitness for a particular project.
              </p>
              <div className="ri-actions">
                <a href={safeAssetUrl(s.url)} target="_blank" rel="noopener noreferrer">
                  Visit original source <ArrowUpRight size={14} />
                </a>
                {isCurator && (
                  <RegistryLink query={query} navigate={navigate} changes={{ view: 'jobs' }}>
                    Open bounded indexing controls
                  </RegistryLink>
                )}
              </div>
            </section>
          </>
        )}
      </RegistryState>
    </>
  );
}
export function RegistryIntelligence(props: IntelligenceProps) {
  const views: { view: AssetQuery['view']; label: string; private?: boolean }[] = [
    { view: 'assets', label: 'All assets' },
    { view: 'sources', label: 'Sources' },
    { view: 'collections', label: 'Asset collections' },
    { view: 'health', label: 'Registry health', private: true },
    { view: 'operations', label: 'Operations', private: true },
    { view: 'collection-editor', label: 'Editorial', private: true },
  ];
  return (
    <section className="registry-intelligence">
      <nav className="ri-nav" aria-label="Registry workspaces">
        {views
          .filter((v) => !v.private || props.isCurator)
          .map((v) => (
            <span key={v.view} aria-current={props.query.view === v.view ? 'page' : undefined}>
              <RegistryLink
                query={props.query}
                navigate={props.navigate}
                changes={{ view: v.view }}
              >
                {v.label}
              </RegistryLink>
            </span>
          ))}
      </nav>
      {props.query.view === 'health' ? (
        <Health {...props} />
      ) : props.query.view === 'operations' ? (
        <RegistryOperations {...props} />
      ) : props.query.view === 'sources' ? (
        <Sources {...props} />
      ) : (
        <AssetCollections {...props} />
      )}
    </section>
  );
}
