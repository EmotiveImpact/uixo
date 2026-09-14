import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fingerprint, type Asset, validateAsset } from './domain.ts';
import {
  componentAsset,
  iconAsset,
  jsonRegistryComponentAsset,
  licenceFromText,
  parseJsonRegistry,
  PROVIDERS,
} from './providers.ts';
import type { Registry } from './service.ts';

export async function capturedAssets(): Promise<Asset[]> {
  const captured = JSON.parse(
    await readFile(new URL('../data/registry/captured.json', import.meta.url), 'utf8'),
  ) as {
    capturedAt: string;
    components: [string, string[]][];
    lucide: string[];
    heroicons: string[];
    refs?: Record<string, string>;
    capturedAtByProvider?: Record<string, string>;
  };
  const assets: Asset[] = [];
  for (const provider of PROVIDERS) {
    const ref = captured.refs?.[provider.id] ?? provider.branch;
    const observedAt = captured.capturedAtByProvider?.[provider.id] ?? captured.capturedAt;
    const body = await readFile(
      new URL(`../data/registry/licences/${provider.id}.txt`, import.meta.url),
      'utf8',
    );
    const licence = licenceFromText(
      provider,
      body,
      `https://github.com/${provider.repo}/blob/${ref}/${provider.licencePath}`,
      observedAt,
    );
    if (provider.adapter === 'shadcn-registry')
      for (const [name, deps] of captured.components)
        assets.push(componentAsset(name, deps, provider, licence, ref, observedAt));
    else if (provider.adapter === 'github-icons')
      for (const name of captured[provider.id as 'lucide' | 'heroicons'])
        assets.push(
          iconAsset(
            provider,
            `${provider.id === 'lucide' ? 'icons' : 'optimized/24/outline'}/${name}.svg`,
            ref,
            licence,
            observedAt,
          ),
        );
    else {
      const manifest = await readFile(
        new URL(`../data/registry/snapshots/${provider.id}.json`, import.meta.url),
        'utf8',
      );
      for (const item of parseJsonRegistry(manifest).filter(
        (entry) => !provider.excludedComponents?.includes(entry.name),
      ))
        assets.push(jsonRegistryComponentAsset(item, provider, licence, ref, observedAt));
    }
  }
  // A branch locator is not an immutable package/version reference. Newer captures retain a
  // commit SHA; legacy branch snapshots remain explicitly unpinned until they are re-indexed.
  for (const asset of assets) {
    if (/^[a-f0-9]{40}$/.test(asset.variants[0]?.sourceRef ?? '')) continue;
    asset.variants.forEach((v) => {
      v.sourceRef = null;
    });
    asset.evidence.forEach((e) => {
      e.reference = null;
      e.method = 'declared';
    });
    asset.licence = {
      ...asset.licence,
      note:
        asset.licence.note +
        ' This bootstrap record was captured from a mutable source branch. Re-index for a commit-pinned acquisition.',
    };
  }
  return assets;
}
export async function seedCaptured(registry: Registry) {
  for (const provider of PROVIDERS) {
    await registry.db.query(
      'INSERT INTO uixo_v2_providers(id,name,approved,payload,updated_at) VALUES($1,$2,1,$3,$4) ON CONFLICT(id) DO NOTHING',
      [provider.id, provider.name, JSON.stringify(provider), new Date().toISOString()],
    );
  }
  const assets = await capturedAssets();
  let inserted = 0;
  for (const asset of assets) {
    const published = await registry.db.query('SELECT id FROM uixo_v2_assets WHERE id=$1', [
      asset.id,
    ]);
    const provider = await registry.db.query('SELECT approved FROM uixo_v2_providers WHERE id=$1', [
      asset.providerId,
    ]);
    if (published.length || Number(provider[0]?.approved) !== 1) continue;
    const staged = await registry.stage(asset);
    if (staged.created) {
      await registry.review(
        staged.id,
        'approve',
        'bootstrap-source-snapshot',
        'Publish captured source metadata for evaluation. Not an individual editorial endorsement.',
      );
      inserted++;
    }
  }
  return { inserted, sourceAssets: assets.length, mode: 'captured-source-snapshot' };
}

/**
 * Publish the current reviewed source snapshot over an existing registry catalogue.
 * This is an explicit operator command: unlike seedCaptured it updates existing rows and
 * removes only provider entries named in the source-backed exclusion policy.
 */
export async function syncCaptured(registry: Registry) {
  for (const provider of PROVIDERS) await registry.putProvider(provider);

  const assets = await capturedAssets();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const asset of assets) {
    const live = await registry.db.query('SELECT fingerprint FROM uixo_v2_assets WHERE id=$1', [
      asset.id,
    ]);
    const desiredFingerprint = fingerprint(validateAsset(asset));
    if (live[0]?.fingerprint === desiredFingerprint) {
      await registry.stage(asset, true);
      unchanged++;
      continue;
    }

    const staged = await registry.stage(asset, true);
    const revision = await registry.db.query('SELECT status FROM uixo_v2_revisions WHERE id=$1', [
      staged.id,
    ]);
    if (revision[0]?.status !== 'pending') {
      throw new Error(
        `Cannot synchronize ${asset.id}: its desired source revision was already ${String(revision[0]?.status ?? 'lost')}.`,
      );
    }
    await registry.review(
      staged.id,
      'approve',
      'bootstrap-preview-sync',
      'Synchronize verified source metadata and the official provider demo capture.',
    );
    if (live.length) updated++;
    else inserted++;
  }

  let removed = 0;
  for (const provider of PROVIDERS) {
    for (const slug of provider.excludedComponents ?? []) {
      const assetId = `${provider.id}/${slug}`;
      const present = await registry.db.query(
        'SELECT id FROM uixo_v2_assets WHERE id=$1 UNION SELECT asset_id AS id FROM uixo_v2_revisions WHERE asset_id=$1 LIMIT 1',
        [assetId],
      );
      if (!present.length) continue;
      const now = new Date().toISOString();
      await registry.db.batch([
        { sql: 'DELETE FROM uixo_v2_revisions WHERE asset_id=$1', args: [assetId] },
        { sql: 'DELETE FROM uixo_v2_assets WHERE id=$1', args: [assetId] },
        {
          sql: 'INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) VALUES($1,$2,$3,$4,$5,$6)',
          args: [
            randomUUID(),
            'bootstrap-preview-sync',
            'unpublish',
            assetId,
            JSON.stringify({
              reason: 'Provider manifest entry has no source file at the pinned revision.',
            }),
            now,
          ],
        },
      ]);
      removed++;
    }
  }

  return {
    inserted,
    updated,
    unchanged,
    removed,
    sourceAssets: assets.length,
    mode: 'verified-preview-sync',
  };
}
