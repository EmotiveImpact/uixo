import { Registry } from './service.ts';
import { fingerprint, validateAsset, type Asset, RegistryError } from './domain.ts';
import { PROVIDERS, licenceFromText } from './providers.ts';
import { readKiboSnapshot, readKiboLicence, kiboComponentAsset } from './kibo.ts';

/** Additive only. This is deliberately not a wrapper around global syncCaptured. */
export async function syncReviewedProvider(
  registry: Registry,
  providerId: string,
  options: { apply?: boolean; actor?: string; reason?: string } = {},
) {
  if (providerId !== 'kibo-ui')
    throw new RegistryError(
      'REVIEW_REQUIRED',
      'No reviewed additive batch exists for this provider.',
      409,
    );
  const provider = PROVIDERS.find((entry) => entry.id === providerId && entry.approved)!;
  const snapshot = await readKiboSnapshot();
  const licence = licenceFromText(
    provider,
    await readKiboLicence(snapshot),
    snapshot.licence.sourceUrl,
    snapshot.observedAt,
  );
  const assets = snapshot.items.map((item) =>
    validateAsset(kiboComponentAsset(item, provider, licence, snapshot)),
  );
  const rows = await registry.db.query(
    'SELECT approved,payload FROM uixo_v2_providers WHERE id=$1',
    [providerId],
  );
  if (
    rows.length &&
    (Number(rows[0].approved) !== 1 ||
      JSON.stringify(JSON.parse(String(rows[0].payload))) !== JSON.stringify(provider))
  )
    throw new RegistryError(
      'CONFLICT',
      'Existing provider metadata or revocation must be reviewed, not overwritten.',
      409,
    );
  const additions: Asset[] = [];
  let unchanged = 0;
  // Complete conflict/rejection preflight before the first write.
  for (const asset of assets) {
    const existing = await registry.db.query('SELECT fingerprint FROM uixo_v2_assets WHERE id=$1', [
      asset.id,
    ]);
    if (existing.length) {
      if (existing[0].fingerprint !== fingerprint(asset))
        throw new RegistryError(
          'CONFLICT',
          `Existing record ${asset.id} differs; additive sync will not replace it.`,
          409,
        );
      unchanged++;
      continue;
    }
    const revisions = await registry.db.query(
      'SELECT id FROM uixo_v2_revisions WHERE asset_id=$1',
      [asset.id],
    );
    if (revisions.length)
      throw new RegistryError(
        'CONFLICT',
        `Existing review history for ${asset.id} requires curator review.`,
        409,
      );
    additions.push(asset);
  }
  const result = {
    providerId,
    sourceRef: snapshot.ref,
    expected: assets.length,
    planned: additions.length,
    inserted: 0,
    unchanged,
    applied: false,
  };
  if (!options.apply) return result;
  if (!options.actor?.trim() || !options.reason?.trim())
    throw new RegistryError(
      'INVALID_INPUT',
      'An operator and review reason are required to publish.',
    );
  // The conflict clause does not change or re-approve an existing provider.
  await registry.db.query(
    'INSERT INTO uixo_v2_providers(id,name,approved,payload,updated_at) VALUES($1,$2,1,$3,$4) ON CONFLICT(id) DO NOTHING',
    [provider.id, provider.name, JSON.stringify(provider), new Date().toISOString()],
  );
  for (const asset of additions) {
    const draft = await registry.stage(asset);
    if (!draft.created)
      throw new RegistryError(
        'CONFLICT',
        `Concurrent review of ${asset.id}; no existing revision was approved.`,
        409,
      );
    const staged = await registry.db.query('SELECT payload FROM uixo_v2_revisions WHERE id=$1', [
      draft.id,
    ]);
    if (JSON.parse(String(staged[0].payload))._baseFingerprint !== null)
      throw new RegistryError(
        'CONFLICT',
        `Concurrent publication of ${asset.id}; additive sync will not replace it.`,
        409,
      );
    // Registry.review atomically checks that the base is still absent and the provider approved.
    await registry.review(draft.id, 'approve', options.actor, options.reason);
    result.inserted++;
  }
  return { ...result, applied: true };
}

/** An operator must first verify the hostname-to-branch mapping in Vercel and Neon. */
export function assertReviewedDatabaseTarget(
  url: string,
  confirmation: {
    host?: string;
    database?: string;
    neonBranchId?: string;
    vercelDeploymentId?: string;
  },
) {
  const parsed = new URL(url);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !confirmation.host ||
    confirmation.host !== parsed.hostname ||
    !confirmation.database ||
    confirmation.database !== decodeURIComponent(parsed.pathname.slice(1)) ||
    !/^br-[a-z0-9-]+$/.test(confirmation.neonBranchId ?? '') ||
    !/^dpl_[a-zA-Z0-9]+$/.test(confirmation.vercelDeploymentId ?? '')
  )
    throw new RegistryError(
      'TARGET_UNCONFIRMED',
      'Exact database host/name and verified Neon branch/Vercel deployment IDs are required. Credentials are never printed.',
      409,
    );
  return {
    host: parsed.hostname,
    database: confirmation.database,
    neonBranchId: confirmation.neonBranchId,
    vercelDeploymentId: confirmation.vercelDeploymentId,
  };
}
