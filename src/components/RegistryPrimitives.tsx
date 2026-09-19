import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { assetHref, EMPTY_ASSET_QUERY } from '../lib/asset-library';
import type { AssetQuery } from '../lib/asset-library';
import type { EvidenceMetrics } from '../../shared/intelligence';
export type IntelligenceProps = {
  query: AssetQuery;
  navigate: (changes: Partial<AssetQuery>, reset?: boolean) => void;
  isCurator: boolean;
  assetSaves: { saved: string[]; save: (ids: string[]) => boolean; accountBacked: boolean };
};
export function RegistryState({
  loading,
  error,
  reload,
  children,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div className="ri-state" role="status">
        Loading registry evidence…
      </div>
    );
  if (error)
    return (
      <div className="ri-state" role="alert">
        <h2>This workspace could not load.</h2>
        <p>{error}</p>
        <button onClick={reload}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  return <>{children}</>;
}
export function RegistryLink({
  children,
  query,
  navigate,
  changes,
  reset = true,
}: {
  children: ReactNode;
  query: AssetQuery;
  navigate: IntelligenceProps['navigate'];
  changes: Partial<AssetQuery>;
  reset?: boolean;
}) {
  return (
    <a
      href={assetHref({ ...(reset ? EMPTY_ASSET_QUERY : query), ...changes })}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(changes, reset);
      }}
    >
      {children}
    </a>
  );
}
export function EvidenceCards({ metrics: m }: { metrics: EvidenceMetrics }) {
  const measures = [
    ['Immutable source pins', m.sourcePinned, 'All variants point to a retained commit.'],
    ['Licence evidence', m.licenceEvidence, 'Retained text and a recorded check date.'],
    [
      'Recorded previews',
      m.total - m.missingPreviews,
      'A capture, pinned live demo or image reference.',
    ],
    ['Acquisition guidance', m.acquisitionReady, 'A ready recipe, not an executed installation.'],
    ['Dependency declarations', m.dependenciesDeclared, 'Source evidence describes dependencies.'],
    [
      'Peer-version constraints',
      m.compatibilityDeclared,
      'Declared ranges, not runtime certification.',
    ],
  ] as const;
  return (
    <div className="ri-metric-grid">
      {measures.map(([label, value, note]) => (
        <article key={label} className="ri-metric">
          <span>{label}</span>
          <strong>
            {value}
            <small> / {m.total}</small>
          </strong>
          <p>{note}</p>
        </article>
      ))}
    </div>
  );
}
