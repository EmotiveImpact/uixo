import { randomUUID } from 'node:crypto';
import type { Asset } from './domain.ts';
import { RegistryError } from './domain.ts';
import type { Registry } from './service.ts';
import { indexPage, type IndexPage } from './providers.ts';

export async function enqueue(registry: Registry, providerId: string, afterJobId?: string) {
  await registry.provider(providerId);
  const id = randomUUID(), now = new Date().toISOString();
  let initial: Record<string, unknown> = { offset: 0, sourceRef: null };
  if (afterJobId) {
    const previous = await registry.db.query("SELECT stats FROM uixo_v2_jobs WHERE id=$1 AND provider_id=$2 AND status='complete'", [afterJobId, providerId]);
    if (!previous.length) throw new RegistryError('INVALID_CONTINUATION', 'A completed run from this provider is required.', 409);
    const stats = JSON.parse(String(previous[0].stats));
    if (!Number.isSafeInteger(stats.nextOffset) || typeof stats.sourceRef !== 'string') throw new RegistryError('NO_MORE_ASSETS', 'This run has no remaining page.', 409);
    initial = { offset: stats.nextOffset, sourceRef: stats.sourceRef, continuedFrom: afterJobId };
  }
  // A partial unique index closes the concurrent enqueue race.
  const rows = await registry.db.query("INSERT INTO uixo_v2_jobs(id,provider_id,status,created_at,updated_at,stats) SELECT $1,$2,'queued',$3,$3,$4 WHERE NOT EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE provider_id=$2 AND status IN ('queued','running','retry')) ON CONFLICT DO NOTHING RETURNING id", [id, providerId, now, JSON.stringify(initial)]);
  if (!rows.length) throw new RegistryError('ALREADY_QUEUED', 'This provider already has an active job.', 409);
  return { id, status: 'queued' };
}
export async function runJob(registry: Registry, id: string, indexer: (id: string, options: { offset?: number; sourceRef?: string | null }) => Promise<Asset[] | IndexPage> = indexPage) {
  const now = new Date().toISOString(), owner = randomUUID();
  const lease = new Date(Date.now() + 240_000).toISOString();
  await registry.db.query("UPDATE uixo_v2_jobs SET status='failed',error='LEASE_EXHAUSTED',updated_at=$2 WHERE id=$1 AND status='running' AND attempts>=3 AND lease_until<$2", [id, now]);
  const claim = await registry.db.query("UPDATE uixo_v2_jobs SET status='running',attempts=attempts+1,lease_owner=$2,lease_until=$3,updated_at=$4 WHERE id=$1 AND attempts<3 AND (status='queued' OR (status='retry' AND (lease_until IS NULL OR lease_until<$4)) OR (status='running' AND lease_until<$4)) RETURNING provider_id,attempts,stats", [id, owner, lease, now]);
  if (!claim.length) throw new RegistryError('JOB_NOT_CLAIMABLE', 'Job is already running, complete, delayed or exhausted.', 409);
  try {
    const settings = JSON.parse(String(claim[0].stats));
    const indexed = await indexer(String(claim[0].provider_id), { offset: settings.offset ?? 0, sourceRef: settings.sourceRef ?? null });
    const assets = Array.isArray(indexed) ? indexed : indexed.assets;
    if (assets.length > 200) throw new RegistryError('BUDGET_EXCEEDED', 'A job may stage at most 200 assets.', 429);
    let staged = 0, duplicates = 0;
    for (const asset of assets) {
      const owned = await registry.db.query("UPDATE uixo_v2_jobs SET lease_until=$3,updated_at=$4 WHERE id=$1 AND lease_owner=$2 AND status='running' AND lease_until>$4 RETURNING id", [id, owner, new Date(Date.now() + 240000).toISOString(), new Date().toISOString()]);
      if (!owned.length) throw new RegistryError('LEASE_LOST', 'Indexing lease was lost.', 409);
      const result = await registry.stage(asset, true); if (result.created) staged++; else duplicates++;
    }
    const stats = { discovered: assets.length, staged, duplicates, published: 0, offset: settings.offset ?? 0, nextOffset: Array.isArray(indexed) ? null : indexed.nextOffset, sourceRef: Array.isArray(indexed) ? null : indexed.sourceRef, sourceTotal: Array.isArray(indexed) ? assets.length : indexed.total };
    await registry.db.query("UPDATE uixo_v2_jobs SET status='complete',stats=$3,lease_until=NULL,updated_at=$4 WHERE id=$1 AND lease_owner=$2", [id, owner, JSON.stringify(stats), new Date().toISOString()]);
    return { id, status: 'complete', ...stats };
  } catch (error) {
    const exhausted = Number(claim[0].attempts) >= 3;
    const code = error instanceof RegistryError ? error.code : 'INDEX_FAILED';
    const retryAt = new Date(Date.now() + Number(claim[0].attempts) * 60_000).toISOString();
    await registry.db.query('UPDATE uixo_v2_jobs SET status=$3,error=$4,lease_until=$5,updated_at=$6 WHERE id=$1 AND lease_owner=$2', [id, owner, exhausted ? 'failed' : 'retry', code, retryAt, new Date().toISOString()]);
    throw new RegistryError(code, 'Indexing did not complete. The job is recorded; no assets were published.', 502);
  }
}
export async function jobs(registry: Registry) {
  return (await registry.db.query('SELECT id,provider_id,status,attempts,created_at,updated_at,stats,error FROM uixo_v2_jobs ORDER BY created_at DESC LIMIT 100')).map((r) => ({ ...r, stats: JSON.parse(String(r.stats)) }));
}
