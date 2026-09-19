import { randomUUID } from 'node:crypto';
import type {
  CandidateSummary,
  CandidateDetail,
  PipelineStage,
  OperationsReport,
  OperationJob,
} from '../shared/intelligence.ts';
import type { Registry } from './service.ts';
import type { Row } from './database.ts';
import { RegistryError, identifier, integer, record, text } from './domain.ts';
import { requireWritable } from './collections.ts';
import { jobs } from './jobs.ts';

const candidatesSql = `SELECT s.id,s.payload,s.created_at,w.provider_id,w.revision,w.reason,w.disposition,
  COALESCE(j.active,0) AS active,COALESCE(j.failed,0) AS failed,COALESCE(j.complete,0) AS complete,
  COALESCE(r.pending,0) AS pending,COALESCE(r.approved,0) AS approved,COALESCE(r.rejected,0) AS rejected,COALESCE(r.live,0) AS live
  FROM uixo_v2_scout s LEFT JOIN uixo_v2_candidate_work w ON w.scout_id=s.id
  LEFT JOIN (SELECT cj.scout_id,
    SUM(CASE WHEN j.status IN ('queued','running','retry') THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN j.status IN ('failed','cancelled') THEN 1 ELSE 0 END) AS failed,
    SUM(CASE WHEN j.status='complete' THEN 1 ELSE 0 END) AS complete
    FROM uixo_v2_candidate_jobs cj JOIN uixo_v2_jobs j ON j.id=cj.job_id GROUP BY cj.scout_id) j ON j.scout_id=s.id
  LEFT JOIN (SELECT cj.scout_id,
    COUNT(DISTINCT CASE WHEN r.status='pending' THEN r.id END) AS pending,
    COUNT(DISTINCT CASE WHEN r.status='approved' THEN r.id END) AS approved,
    COUNT(DISTINCT CASE WHEN r.status='rejected' THEN r.id END) AS rejected,
    COUNT(DISTINCT CASE WHEN r.status='approved' AND a.fingerprint=r.fingerprint AND p.approved=1 THEN r.id END) AS live
    FROM uixo_v2_candidate_jobs cj JOIN uixo_v2_job_revisions jr ON jr.job_id=cj.job_id
    JOIN uixo_v2_revisions r ON r.id=jr.revision_id
    LEFT JOIN uixo_v2_assets a ON a.id=r.asset_id LEFT JOIN uixo_v2_providers p ON p.id=a.provider_id
    GROUP BY cj.scout_id) r ON r.scout_id=s.id`;
function summary(row: Row): CandidateSummary {
  const payload = JSON.parse(String(row.payload));
  const active = Number(row.active),
    pending = Number(row.pending),
    live = Number(row.live);
  const failed = Number(row.failed),
    complete = Number(row.complete);
  const stage: PipelineStage =
    row.disposition === 'rejected'
      ? 'rejected'
      : active
        ? 'investigating'
        : pending
          ? 'review'
          : live
            ? 'published'
            : failed || complete
              ? 'blocked'
              : 'discovered';
  return {
    id: String(row.id),
    name: String(payload.name ?? row.id),
    url: String(payload.url ?? ''),
    note: String(payload.note ?? ''),
    source: String(payload.source ?? 'scout'),
    postUrl: typeof payload.postUrl === 'string' ? payload.postUrl : null,
    createdAt: String(row.created_at),
    providerId: row.provider_id ? String(row.provider_id) : null,
    revision: Number(row.revision ?? 0),
    reason: String(row.reason ?? ''),
    stage,
    pending,
    live,
    approved: Number(row.approved),
    rejected: Number(row.rejected),
    activeJobs: active,
    failedJobs: failed,
    completedJobs: complete,
  };
}
export async function operations(
  registry: Registry,
  input: unknown = {},
): Promise<OperationsReport> {
  const raw = record(input),
    limit = integer(raw.limit, 24, 1, 48),
    offset = integer(raw.offset, 0, 0, 100000);
  const rows = await registry.db.query(
    candidatesSql + ' ORDER BY s.created_at DESC,s.id LIMIT 10001',
  );
  if (rows.length > 10000)
    throw new RegistryError(
      'OPERATIONS_LIMIT',
      'Candidate volume exceeds the synchronous board budget.',
      503,
    );
  const all = rows.map(summary);
  const totals: OperationsReport['totals'] = {
    discovered: 0,
    investigating: 0,
    review: 0,
    published: 0,
    rejected: 0,
    blocked: 0,
  };
  all.forEach((c) => totals[c.stage]++);
  const stage = text(raw.stage, 30, true);
  if (stage && !Object.hasOwn(totals, stage))
    throw new RegistryError('INVALID_INPUT', 'Unknown pipeline stage.');
  const selected = stage ? all.filter((c) => c.stage === stage) : all;
  const items = selected.slice(offset, offset + limit);
  return {
    totals,
    total: selected.length,
    offset,
    nextOffset: offset + items.length < selected.length ? offset + items.length : null,
    items,
    jobs: (await jobs(registry)) as unknown as OperationJob[],
    readOnly: registry.db.mode === 'snapshot',
  };
}
export async function candidateDetail(registry: Registry, id: string): Promise<CandidateDetail> {
  const rows = await registry.db.query(candidatesSql + ' WHERE s.id=$1', [identifier(id)]);
  if (!rows.length) throw new RegistryError('NOT_FOUND', 'Scout candidate not found.', 404);
  const [linkedJobs, revisions, counts, deliveries, history] = await Promise.all([
    registry.db.query(
      'SELECT j.* FROM uixo_v2_jobs j JOIN uixo_v2_candidate_jobs cj ON cj.job_id=j.id WHERE cj.scout_id=$1 ORDER BY j.created_at DESC LIMIT 48',
      [id],
    ),
    registry.db.query(
      'SELECT DISTINCT r.id,r.asset_id,r.payload,r.status,r.reason,r.created_at FROM uixo_v2_revisions r JOIN uixo_v2_job_revisions jr ON jr.revision_id=r.id JOIN uixo_v2_candidate_jobs cj ON cj.job_id=jr.job_id WHERE cj.scout_id=$1 ORDER BY r.created_at DESC,r.id LIMIT 48',
      [id],
    ),
    registry.db.query(
      'SELECT COUNT(DISTINCT jr.revision_id) AS count FROM uixo_v2_job_revisions jr JOIN uixo_v2_candidate_jobs cj ON cj.job_id=jr.job_id WHERE cj.scout_id=$1',
      [id],
    ),
    registry.db.query(
      'SELECT repository,issue_number,received_at FROM uixo_v2_scout_deliveries WHERE scout_id=$1 ORDER BY received_at DESC LIMIT 24',
      [id],
    ),
    registry.db.query(
      'SELECT actor,action,detail,created_at FROM uixo_v2_audit WHERE target=$1 ORDER BY created_at DESC,id LIMIT 48',
      [id],
    ),
  ]);
  return {
    candidate: summary(rows[0]),
    jobs: linkedJobs.map((j) => ({
      ...j,
      stats: JSON.parse(String(j.stats)),
    })) as unknown as OperationJob[],
    revisions: revisions.map((r) => ({
      id: String(r.id),
      assetId: String(r.asset_id),
      name: String(JSON.parse(String(r.payload)).name),
      status: String(r.status),
      reason: String(r.reason),
    })),
    revisionTotal: Number(counts[0].count),
    deliveries: deliveries.map((r) => ({
      repository: String(r.repository),
      issueNumber: Number(r.issue_number),
      receivedAt: String(r.received_at),
    })),
    history: history as unknown as CandidateDetail['history'],
  };
}
async function ensureWork(registry: Registry, id: string, actor: string) {
  const found = await registry.db.query('SELECT id FROM uixo_v2_scout WHERE id=$1', [id]);
  if (!found.length) throw new RegistryError('NOT_FOUND', 'Scout candidate not found.', 404);
  await registry.db.query(
    'INSERT INTO uixo_v2_candidate_work(scout_id,updated_at,updated_by) VALUES($1,$2,$3) ON CONFLICT(scout_id) DO NOTHING',
    [id, new Date().toISOString(), actor],
  );
}
export async function updateCandidate(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const raw = record(input),
    id = identifier(raw.id),
    expected = integer(raw.expectedRevision, -1, 0, 1000000);
  const decision = text(raw.decision, 20),
    reason = text(raw.reason, 2000);
  if (!['link', 'reject', 'reopen'].includes(decision) || reason.length < 10 || expected < 0)
    throw new RegistryError(
      'INVALID_INPUT',
      'Supply a revision, link/reject/reopen decision and a reason of at least ten characters.',
    );
  const providerId = decision === 'link' ? identifier(raw.providerId) : null;
  if (providerId) await registry.provider(providerId);
  await ensureWork(registry, id, actor);
  const token = randomUUID(),
    now = new Date().toISOString();
  const change =
    decision === 'link'
      ? 'provider_id=$7'
      : `disposition='${decision === 'reject' ? 'rejected' : 'open'}'`;
  const guard =
    decision === 'link'
      ? "AND disposition='open' AND (provider_id IS NULL OR provider_id=$7 OR NOT EXISTS(SELECT 1 FROM uixo_v2_candidate_jobs WHERE scout_id=$1)) AND EXISTS(SELECT 1 FROM uixo_v2_providers WHERE id=$7 AND approved=1)"
      : decision === 'reject'
        ? "AND disposition='open' AND NOT EXISTS(SELECT 1 FROM uixo_v2_candidate_jobs cj JOIN uixo_v2_jobs j ON j.id=cj.job_id WHERE cj.scout_id=$1 AND j.status IN ('queued','running','retry'))"
        : "AND disposition='rejected'";
  const result = await registry.db.batch([
    {
      sql: `UPDATE uixo_v2_candidate_work SET ${change},revision=revision+1,reason=$3,updated_at=$4,updated_by=$5,mutation_token=$6 WHERE scout_id=$1 AND revision=$2 ${guard} RETURNING scout_id`,
      args:
        decision === 'link'
          ? [id, expected, reason, now, actor, token, providerId]
          : [id, expected, reason, now, actor, token],
    },
    {
      sql: 'INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $1,$2,$3,$4,$5,$6 WHERE EXISTS(SELECT 1 FROM uixo_v2_candidate_work WHERE scout_id=$4 AND mutation_token=$7)',
      args: [
        randomUUID(),
        actor,
        'candidate-' + decision,
        id,
        JSON.stringify({ reason, providerId }),
        now,
        token,
      ],
    },
  ]);
  if (!result[0].length)
    throw new RegistryError(
      'CONFLICT',
      'Candidate changed or has active investigation work. Reload; cancel active jobs before rejection.',
      409,
    );
  return candidateDetail(registry, id);
}
/** Candidate/provider approval is a curator decision. Workers may only investigate an existing link. */
export async function investigateCandidate(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const raw = record(input),
    id = identifier(raw.id),
    expected = integer(raw.expectedRevision, -1, 0, 1000000);
  if (expected < 0) throw new RegistryError('INVALID_INPUT', 'Candidate revision is required.');
  const c = (await candidateDetail(registry, id)).candidate;
  if (!c.providerId)
    throw new RegistryError(
      'PROVIDER_REVIEW_REQUIRED',
      'A curator must link an approved provider before investigation. New adapters require source review.',
      409,
    );
  const providerId = c.providerId;
  await registry.provider(providerId);
  const settings: Record<string, unknown> = { offset: 0, sourceRef: null };
  if (raw.afterJobId) {
    const prior = await registry.db.query(
      "SELECT j.stats FROM uixo_v2_jobs j JOIN uixo_v2_candidate_jobs cj ON cj.job_id=j.id WHERE cj.scout_id=$1 AND j.id=$2 AND j.provider_id=$3 AND j.status='complete'",
      [id, identifier(raw.afterJobId), providerId],
    );
    if (!prior.length)
      throw new RegistryError(
        'INVALID_CONTINUATION',
        'A completed job linked to this candidate is required.',
        409,
      );
    const stats = JSON.parse(String(prior[0].stats));
    if (
      !Number.isSafeInteger(stats.nextOffset) ||
      stats.nextOffset < 0 ||
      stats.nextOffset > 100000 ||
      !/^[a-f0-9]{40}$/i.test(stats.sourceRef ?? '')
    )
      throw new RegistryError('NO_MORE_ASSETS', 'This job has no commit-pinned continuation.', 409);
    Object.assign(settings, {
      offset: stats.nextOffset,
      sourceRef: stats.sourceRef,
      continuedFrom: raw.afterJobId,
    });
  }
  const jobId = randomUUID(),
    token = randomUUID(),
    now = new Date().toISOString();
  // A failed compare-and-swap removes this transaction's new job before commit. No orphan work escapes.
  const result = await registry.db.batch([
    {
      sql: "INSERT INTO uixo_v2_jobs(id,provider_id,status,created_at,updated_at,stats) SELECT $1,$2,'queued',$3,$3,$4 WHERE EXISTS(SELECT 1 FROM uixo_v2_candidate_work w JOIN uixo_v2_providers p ON p.id=w.provider_id WHERE w.scout_id=$5 AND w.revision=$6 AND w.disposition='open' AND p.approved=1 AND w.provider_id=$2) AND NOT EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE provider_id=$2 AND status IN ('queued','running','retry')) ON CONFLICT DO NOTHING RETURNING id",
      args: [jobId, providerId, now, JSON.stringify(settings), id, expected],
    },
    {
      sql: "UPDATE uixo_v2_candidate_work SET revision=revision+1,updated_at=$3,updated_by=$4,mutation_token=$5 WHERE scout_id=$1 AND revision=$2 AND disposition='open' AND provider_id=$7 AND EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE id=$6) RETURNING scout_id",
      args: [id, expected, now, actor, token, jobId, providerId],
    },
    {
      sql: 'DELETE FROM uixo_v2_jobs WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM uixo_v2_candidate_work WHERE scout_id=$2 AND mutation_token=$3)',
      args: [jobId, id, token],
    },
    {
      sql: 'INSERT INTO uixo_v2_candidate_jobs(scout_id,job_id,created_at) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE id=$2)',
      args: [id, jobId, now],
    },
    {
      sql: "INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $1,$2,'candidate-investigate',$3,$4,$5 WHERE EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE id=$6)",
      args: [
        randomUUID(),
        actor,
        id,
        JSON.stringify({ jobId, providerId, ...settings }),
        now,
        jobId,
      ],
    },
  ]);
  if (!result[0].length || !result[1].length)
    throw new RegistryError(
      'CONFLICT',
      'Candidate changed or the provider already has active work. Reload instead of duplicating it.',
      409,
    );
  return { id: jobId, candidateId: id, status: 'queued', published: 0, revision: expected + 1 };
}
export async function cancelJob(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const raw = record(input),
    id = identifier(raw.id),
    reason = text(raw.reason, 2000);
  if (reason.length < 10)
    throw new RegistryError(
      'INVALID_INPUT',
      'Give a cancellation reason of at least ten characters.',
    );
  const token = randomUUID(),
    now = new Date().toISOString();
  const result = await registry.db.batch([
    {
      sql: "UPDATE uixo_v2_jobs SET status='cancelled',lease_owner=$2,lease_until=NULL,updated_at=$3,error='CANCELLED' WHERE id=$1 AND status IN ('queued','running','retry') RETURNING id",
      args: [id, token, now],
    },
    {
      sql: "INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $1,$2,'job-cancel',$3,$4,$5 WHERE EXISTS(SELECT 1 FROM uixo_v2_jobs WHERE id=$3 AND lease_owner=$6 AND status='cancelled')",
      args: [randomUUID(), actor, id, JSON.stringify({ reason }), now, token],
    },
  ]);
  if (!result[0].length)
    throw new RegistryError('CONFLICT', 'Only an active job can be cancelled.', 409);
  return { id, status: 'cancelled', published: 0 };
}

export async function revisionDetail(registry: Registry, id: string) {
  const rows = await registry.db.query(
    'SELECT payload,status,reason FROM uixo_v2_revisions WHERE id=$1',
    [identifier(id)],
  );
  if (!rows.length) throw new RegistryError('NOT_FOUND', 'Revision not found.', 404);
  const { _baseFingerprint, ...asset } = JSON.parse(String(rows[0].payload));
  void _baseFingerprint;
  return { asset, status: String(rows[0].status), reason: String(rows[0].reason) };
}
