import { readFile } from 'node:fs/promises';
import { COMPONENT_CATEGORIES } from '../shared/component-categories.ts';
import type {
  CoverageReport,
  EvidenceMetrics,
  Freshness,
  SourceHealth,
} from '../shared/intelligence.ts';
import type { Asset } from './domain.ts';
import { RegistryError, canonicalUrl } from './domain.ts';
import type { Registry } from './service.ts';
import { resolveAsset } from './policy.ts';

export const COVERAGE_POLICY = {
  freshDays: 30,
  staleDays: 90,
  thinCategoryBelow: 5,
  maximumAssets: 10000,
};
type Media = {
  captures: Record<string, { path: string; sourceUrl: string; capturedAt: string }>;
  live: Record<string, { ref: string; sourceUrl: string }>;
};
let mediaPromise: Promise<Media> | undefined;
function media(): Promise<Media> {
  return (mediaPromise ??= Promise.all([
    readFile(new URL('../public/assets/component-previews/manifest.json', import.meta.url), 'utf8'),
    readFile(new URL('../live-demos/manifest.json', import.meta.url), 'utf8'),
  ]).then(([captures, live]) => ({
    captures: JSON.parse(captures).captures,
    live: JSON.parse(live),
  })));
}
export function freshness(value: string | null, now = Date.now()): Freshness {
  const time = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || time > now) return 'unknown';
  const days = (now - time) / 86400000;
  return days <= COVERAGE_POLICY.freshDays
    ? 'fresh'
    : days <= COVERAGE_POLICY.staleDays
      ? 'ageing'
      : 'stale';
}
export function emptyMetrics(): EvidenceMetrics {
  return {
    total: 0,
    sourcePinned: 0,
    licenceEvidence: 0,
    commercialAllowed: 0,
    acquisitionReady: 0,
    dependenciesDeclared: 0,
    compatibilityDeclared: 0,
    officialCaptures: 0,
    pinnedLiveDemos: 0,
    upstreamImages: 0,
    missingPreviews: 0,
    fresh: 0,
    ageing: 0,
    stale: 0,
    unknown: 0,
  };
}
/** Stored evidence only. This never infers an upstream change from a date. */
export function measureAsset(asset: Asset, index: Media, now = Date.now()): EvidenceMetrics {
  const m = emptyMetrics();
  m.total = 1;
  m[freshness(asset.verifiedAt, now)] = 1;
  m.sourcePinned = Number(
    asset.variants.length > 0 &&
      asset.variants.every((v) => /^[a-f0-9]{40}$/i.test(v.sourceRef ?? '')),
  );
  m.licenceEvidence = Number(
    Boolean(asset.licence.text?.trim()) && freshness(asset.licence.checkedAt, now) !== 'unknown',
  );
  m.commercialAllowed = Number(m.licenceEvidence === 1 && asset.licence.commercial === 'allowed');
  m.dependenciesDeclared = Number(
    asset.evidence.some((e) => /dependenc/i.test(e.field) && e.method !== 'inferred'),
  );
  m.compatibilityDeclared = Number(
    asset.variants.some((v) => Object.keys(v.peerDependencies ?? {}).length > 0),
  );
  try {
    m.acquisitionReady = Number(resolveAsset(asset).status === 'ready');
  } catch {
    /* Unsafe/unknown route is not ready. */
  }
  const capture = index.captures[asset.id];
  const live = index.live[asset.id];
  let captured = false;
  if (capture && asset.preview?.url) {
    try {
      const url = new URL(asset.preview.url);
      captured = url.origin === 'https://uixo-brown.vercel.app' && url.pathname === capture.path;
    } catch {
      /* Invalid legacy media remains unsupported. */
    }
  }
  const pinnedLive = Boolean(
    live &&
    /^[a-f0-9]{40}$/i.test(live.ref) &&
    asset.variants.some((v) => v.sourceRef === live.ref),
  );
  m.officialCaptures = Number(captured);
  m.pinnedLiveDemos = Number(pinnedLive);
  // An arbitrary image or label does not establish provider-captured provenance.
  m.upstreamImages = Number(
    !captured && asset.preview?.kind === 'image' && Boolean(asset.preview.url),
  );
  m.missingPreviews = Number(!captured && !pinnedLive && !m.upstreamImages);
  return m;
}
export async function coverage(registry: Registry, providerId?: string): Promise<CoverageReport> {
  if (providerId) await registry.provider(providerId);
  const providers = await registry.providers();
  const rows = await registry.db.query(
    `SELECT a.payload FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE p.approved=1 AND a.kind<>'icon' ${providerId ? 'AND a.provider_id=$1' : ''} ORDER BY a.id LIMIT 10001`,
    providerId ? [providerId] : [],
  );
  if (rows.length > COVERAGE_POLICY.maximumAssets)
    throw new RegistryError(
      'COVERAGE_LIMIT',
      'Coverage exceeds the synchronous analysis budget. Use a provider-scoped report.',
      503,
    );
  const assets = rows.map((r) => JSON.parse(String(r.payload)) as Asset);
  const index = await media(),
    now = Date.now(),
    metrics = emptyMetrics();
  const measurements = new Map(assets.map((a) => [a.id, measureAsset(a, index, now)]));
  const sum = (items: Asset[]) => {
    const result = emptyMetrics();
    for (const a of items)
      for (const key of Object.keys(result) as (keyof EvidenceMetrics)[])
        result[key] += measurements.get(a.id)![key];
    return result;
  };
  Object.assign(metrics, sum(assets));
  const sources: SourceHealth[] = providers
    .filter((p) => !providerId || p.id === providerId)
    .map((p) => {
      const items = assets.filter((a) => a.providerId === p.id);
      const dates = items
        .map((a) => a.verifiedAt)
        .filter((d): d is string => Boolean(d) && freshness(d, now) !== 'unknown')
        .sort();
      return {
        id: p.id,
        name: p.name,
        url: p.url,
        rationale: p.rationale,
        metrics: sum(items),
        frameworks: [...new Set(items.flatMap((a) => a.variants.map((v) => v.framework)))].sort(),
        formats: [...new Set(items.flatMap((a) => a.variants.map((v) => v.format)))].sort(),
        licences: [...new Set(items.map((a) => a.licence.expression))].sort(),
        oldestVerifiedAt: dates[0] ?? null,
        newestVerifiedAt: dates.at(-1) ?? null,
        upstreamStatus: 'not-checked',
      };
    });
  const categories: CoverageReport['categories'] = COMPONENT_CATEGORIES.map((c) => {
    const items = assets.filter((a) => a.kind === 'component' && a.category === c.id);
    return {
      ...c,
      assets: items.length,
      providers: new Set(items.map((a) => a.providerId)).size,
      state: !items.length
        ? 'empty'
        : items.length < COVERAGE_POLICY.thinCategoryBelow
          ? 'thin'
          : 'covered',
    };
  });
  const gaps: CoverageReport['gaps'] = [
    {
      code: 'missing-preview',
      label: 'Assets without a recorded preview',
      count: metrics.missingPreviews,
    },
    {
      code: 'unpinned-source',
      label: 'Assets without immutable source pins',
      count: metrics.total - metrics.sourcePinned,
    },
    {
      code: 'licence-evidence',
      label: 'Assets without retained, dated licence evidence',
      count: metrics.total - metrics.licenceEvidence,
    },
    {
      code: 'compatibility-unknown',
      label: 'Assets without declared peer-version constraints',
      count: metrics.total - metrics.compatibilityDeclared,
    },
    ...categories
      .filter((c) => c.state !== 'covered')
      .map((c) => ({
        code: 'category-' + c.id,
        label: c.label + ' coverage is ' + c.state,
        count: c.assets,
      })),
    ...sources
      .filter((s) => s.metrics.stale || s.metrics.unknown)
      .map((s) => ({
        code: 'refresh-source',
        label: 'Review freshness for ' + s.name,
        count: s.metrics.stale + s.metrics.unknown,
        providerId: s.id,
      })),
  ];
  const byUrl = new Map<string, string[]>();
  for (const asset of assets) {
    let url = asset.sourceUrl;
    try {
      url = canonicalUrl(url);
    } catch {
      /* Preserve the stored locator for an invalid legacy record. */
    }
    byUrl.set(url, [...(byUrl.get(url) ?? []), asset.id]);
  }
  return {
    generatedAt: new Date(now).toISOString(),
    policy: COVERAGE_POLICY,
    metrics,
    sources,
    categories,
    gaps,
    duplicateSources: [...byUrl]
      .filter(([, ids]) => ids.length > 1)
      .map(([sourceUrl, assetIds]) => ({ sourceUrl, assetIds })),
    upstreamStatus: 'not-checked',
  };
}
export async function sourceHealth(registry: Registry, id: string): Promise<SourceHealth> {
  return (await coverage(registry, id)).sources[0];
}
