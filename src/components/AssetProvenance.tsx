import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { EMPTY_ASSET_QUERY, assetHref, safeAssetUrl } from '../lib/asset-library';
import type { AssetRecord } from '../lib/asset-library';

export function AssetProvenance({
  asset,
  variantId,
  providerName,
}: {
  asset: AssetRecord;
  variantId: string;
  providerName: string;
}) {
  const [openedAt] = useState(() => Date.now());
  const variant = asset.variants.find((entry) => entry.id === variantId);
  const sourceRef = variant?.sourceRef;
  const pinned = /^[a-f0-9]{40}$/i.test(sourceRef ?? '');
  const observed = asset.verifiedAt ? Date.parse(asset.verifiedAt) : NaN;
  const dated = Number.isFinite(observed) && observed <= openedAt;
  return (
    <section className="asset-drawer-section dv2-provenance" aria-label="Source evidence summary">
      <div className="dv2-provenance-heading">
        <h3>Know the source.</h3>
        <a href={assetHref({ ...EMPTY_ASSET_QUERY, view: 'sources', provider: asset.providerId })}>
          Source profile <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
      <dl className="asset-library-facts asset-drawer-facts">
        <div>
          <dt>Provider</dt>
          <dd>{providerName}</dd>
        </div>
        <div>
          <dt>Source reference</dt>
          <dd>
            {sourceRef ? (
              <code title={sourceRef}>{pinned ? sourceRef.slice(0, 12) : sourceRef}</code>
            ) : (
              'Not pinned'
            )}
          </dd>
        </div>
        <div>
          <dt>Reference type</dt>
          <dd>{pinned ? 'Immutable commit' : sourceRef ? 'Declared reference' : 'Unknown'}</dd>
        </div>
        <div>
          <dt>Evidence recorded</dt>
          <dd>{dated ? new Date(observed).toLocaleDateString('en-GB') : 'Not recorded'}</dd>
        </div>
      </dl>
      <p className="dv2-provenance-note">
        A source pin records the inspected version. It is not a security, accessibility or
        compatibility certification.
      </p>
      <div className="ri-actions">
        <a href={safeAssetUrl(asset.licence.sourceUrl)} target="_blank" rel="noopener noreferrer">
          Original licence <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      {!!variant?.registryDependencies?.length && (
        <p className="dv2-provenance-note">
          <strong>Related registry components:</strong> {variant.registryDependencies.join(', ')}
        </p>
      )}
      {!!Object.keys(variant?.peerDependencies ?? {}).length && (
        <p className="dv2-provenance-note">
          <strong>Declared peer versions:</strong>{' '}
          {Object.entries(variant!.peerDependencies!)
            .map(([name, version]) => name + ' ' + version)
            .join(', ')}
        </p>
      )}
    </section>
  );
}
