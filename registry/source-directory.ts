import type { SourceDirectoryResult, SourceSummary } from '../shared/source-directory.ts';
import type { EvidenceMetrics } from '../shared/intelligence.ts';
import type { Asset, Provider } from './domain.ts';
import { identifier, integer, RegistryError } from './domain.ts';
import { emptyMetrics, freshness, measureAsset, media } from './intelligence.ts';
import type { Registry } from './service.ts';

/** Public browsing has its own bounded evidence budget, not the curator coverage cap. */
export const SOURCE_DIRECTORY_POLICY = {
  maximumProviders: 48,
  maximumEvidenceAssets: 2000,
  maximumAssetsPerSource: 1000,
};

type SourceQuery = { q?: string; offset?: number; limit?: number; providerId?: string };

export async function sourceDirectory(
  registry: Registry,
  options: SourceQuery = {},
): Promise<SourceDirectoryResult> {
  const limit = integer(options.limit, 24, 1, SOURCE_DIRECTORY_POLICY.maximumProviders);
  const offset = integer(options.offset, 0, 0, 100000);
  if (options.q !== undefined && (typeof options.q !== 'string' || options.q.length > 120))
    throw new RegistryError('INVALID_INPUT', 'Source search must contain at most 120 characters.');
  const q = (options.q ?? '').trim().toLowerCase();
  const params: (string | number)[] = [];
  const clauses = ['p.approved=1'];
  if (options.providerId) {
    params.push(identifier(options.providerId));
    clauses.push(`p.id=$${params.length}`);
  }
  if (q) {
    params.push('%' + q.replace(/[\\%_]/g, '\\$&') + '%');
    const needle = `$${params.length}`;
    // Search the complete eligible provider set, not just the visible page.
    clauses.push(`(LOWER(p.name) LIKE ${needle} ESCAPE '\\'
      OR LOWER(p.payload) LIKE ${needle} ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM uixo_v2_assets a
        JOIN uixo_v2_licences l ON l.id=a.licence_id
        WHERE a.provider_id=p.id AND a.kind<>'icon'
        AND (LOWER(l.expression) LIKE ${needle} ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM uixo_v2_variants v WHERE v.asset_id=a.id
            AND LOWER(v.framework) LIKE ${needle} ESCAPE '\\'))))`);
  }
  const where = clauses.join(' AND ');
  const counts = await registry.db.query(
    `SELECT COUNT(*) AS total FROM uixo_v2_providers p WHERE ${where}`,
    params,
  );
  const total = Number(counts[0]?.total ?? 0);
  const rows = await registry.db.query(
    `SELECT p.id,p.name,p.payload,
      (SELECT COUNT(*) FROM uixo_v2_assets a WHERE a.provider_id=p.id AND a.kind<>'icon') AS asset_count
      FROM uixo_v2_providers p WHERE ${where}
      ORDER BY LOWER(p.name),p.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  const now = Date.now();
  const items: SourceSummary[] = rows.map((row) => {
    const provider = JSON.parse(String(row.payload)) as Provider;
    return {
      id: String(row.id),
      name: String(row.name),
      url: provider.url,
      rationale: provider.rationale,
      assetCount: Number(row.asset_count),
      metrics: null,
      evidenceStatus: 'deferred',
      evidenceNote:
        'Detailed evidence was not calculated in this request. Inspect individual assets for their retained evidence.',
      frameworks: [],
      formats: [],
      licences: [],
      oldestVerifiedAt: null,
      newestVerifiedAt: null,
      upstreamStatus: 'not-checked',
    };
  });
  let remaining = SOURCE_DIRECTORY_POLICY.maximumEvidenceAssets;
  const eligible = items.filter((item) => {
    if (
      item.assetCount > SOURCE_DIRECTORY_POLICY.maximumAssetsPerSource ||
      item.assetCount > remaining
    )
      return false;
    remaining -= item.assetCount;
    return true;
  });
  const ids = eligible.map((item) => item.id);
  // At most three database reads and 2,001 returned asset payloads, regardless of catalogue size.
  const assetRows = ids.length
    ? await registry.db.query(
        `SELECT a.id,a.provider_id,a.payload FROM uixo_v2_assets a
      JOIN uixo_v2_providers p ON p.id=a.provider_id
      WHERE p.approved=1 AND a.kind<>'icon'
      AND a.provider_id IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})
      ORDER BY a.provider_id,a.id LIMIT ${SOURCE_DIRECTORY_POLICY.maximumEvidenceAssets + 1}`,
        ids,
      )
    : [];
  const withinBudget = assetRows.length <= SOURCE_DIRECTORY_POLICY.maximumEvidenceAssets;
  if (withinBudget && eligible.length) {
    const index = await media();
    const groups = new Map<string, Asset[]>();
    const invalid = new Set<string>();
    for (const row of assetRows) {
      const id = String(row.provider_id);
      try {
        const asset = JSON.parse(String(row.payload)) as Asset;
        if (asset.providerId !== id || asset.id !== String(row.id))
          throw new Error('Inconsistent asset');
        const group = groups.get(id) ?? [];
        group.push(asset);
        groups.set(id, group);
      } catch {
        invalid.add(id);
      }
    }
    for (const item of eligible) {
      const assets = groups.get(item.id) ?? [];
      // A concurrent publication, corrupt record or truncated result must never become sampled evidence.
      if (invalid.has(item.id) || assets.length !== item.assetCount) continue;
      try {
        const metrics = emptyMetrics();
        for (const asset of assets) {
          const measured = measureAsset(asset, index, now);
          for (const key of Object.keys(metrics) as (keyof EvidenceMetrics)[])
            metrics[key] += measured[key];
        }
        const dates = assets
          .map((a) => a.verifiedAt)
          .filter((d): d is string => Boolean(d) && freshness(d, now) !== 'unknown')
          .sort();
        Object.assign(item, {
          metrics,
          evidenceStatus: 'complete',
          evidenceNote: null,
          frameworks: [
            ...new Set(assets.flatMap((a) => a.variants.map((v) => v.framework))),
          ].sort(),
          formats: [...new Set(assets.flatMap((a) => a.variants.map((v) => v.format)))].sort(),
          licences: [...new Set(assets.map((a) => a.licence.expression))].sort(),
          oldestVerifiedAt: dates[0] ?? null,
          newestVerifiedAt: dates.at(-1) ?? null,
        });
      } catch {
        // Invalid legacy evidence is unavailable, not a zero score or a public directory outage.
      }
    }
  }
  return {
    items,
    total,
    offset,
    limit,
    nextOffset: offset + items.length < total && items.length > 0 ? offset + items.length : null,
    generatedAt: new Date(now).toISOString(),
  };
}

export async function publicSourceHealth(registry: Registry, id: string): Promise<SourceSummary> {
  const result = await sourceDirectory(registry, { providerId: identifier(id), limit: 1 });
  if (!result.items[0]) throw new RegistryError('NOT_FOUND', 'Approved source not found.', 404);
  return result.items[0];
}
