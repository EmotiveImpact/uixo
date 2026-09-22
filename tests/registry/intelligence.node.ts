import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { approvedCapturedAssets, seedCaptured, capturedAssets } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { freshness, measureAsset, coverage } from '../../registry/intelligence.ts';
import {
  getCollection,
  listCollections,
  saveCollection,
  publishCollection,
  seedCollectionDrafts,
} from '../../registry/collections.ts';
import {
  operations,
  candidateDetail,
  updateCandidate,
  investigateCandidate,
  cancelJob,
} from '../../registry/operations.ts';
import { parseGithubIssue, ingestGithubIssue } from '../../registry/scout-github.ts';
import { deliverIssue } from '../../services/grok/intake.ts';
import { runJob, enqueue } from '../../registry/jobs.ts';
import { createRegistryHandler } from '../../registry/http.ts';
import type { CollectionRecord } from '../../shared/intelligence.ts';

async function setup(seed = true, snapshot = false) {
  const db = await sqliteDatabase(':memory:', snapshot);
  await migrate(db);
  const registry = new Registry(db);
  if (seed) await seedCaptured(registry);
  return { db, registry };
}
const reason = 'Reviewed source and evidence with the original provider.';
const draft = {
  slug: 'test-stack',
  title: 'A clear stack',
  description: 'A deliberately small collection.',
  items: [
    { kind: 'asset', targetId: 'shadcn/card', note: 'Use as a container.' },
    { kind: 'provider', targetId: 'shadcn', note: 'Inspect the original source.' },
  ],
  expectedRevision: 0,
};
function issue(url = 'https://ui.shadcn.com/', number = 1, extra = {}) {
  return {
    repository: 'EmotiveImpact/uixo',
    number,
    title: 'A source to investigate',
    author: 'EmotiveImpact',
    url: `https://github.com/EmotiveImpact/uixo/issues/${number}`,
    body:
      'Discovery, not approval.\n```uixo-candidate\n' +
      JSON.stringify({ schemaVersion: 1, name: 'A source', url, reason, ...extra }) +
      '\n```',
  };
}
async function candidate(registry: Registry) {
  await registry.scout({
    items: [{ name: 'shadcn', url: 'https://ui.shadcn.com/', note: reason }],
  });
  return (await operations(registry)).items[0];
}

test('intelligence migration is repeatable and leaves existing registry rows unchanged', async () => {
  const { db, registry } = await setup();
  try {
    await migrate(db);
    assert.equal((await registry.stats()).assets, (await approvedCapturedAssets()).length);
    assert.equal((await listCollections(registry)).total, 0);
  } finally {
    await db.close();
  }
});
test('freshness is policy-defined and never treats future or absent dates as fresh', () => {
  const now = Date.parse('2026-09-19T12:00:00Z');
  assert.equal(freshness(null, now), 'unknown');
  assert.equal(freshness('not-a-date', now), 'unknown');
  assert.equal(freshness('2027-01-01', now), 'unknown');
  assert.equal(freshness('2026-09-18', now), 'fresh');
  assert.equal(freshness('2026-08-01', now), 'ageing');
  assert.equal(freshness('2025-01-01', now), 'stale');
});
test('evidence metrics do not manufacture preview, dependency or compatibility evidence', async () => {
  const asset = (await capturedAssets())[0];
  const metrics = measureAsset(
    {
      ...asset,
      preview: null,
      evidence: [],
      variants: asset.variants.map((v) => ({ ...v, sourceRef: 'main', peerDependencies: {} })),
    },
    { captures: {}, live: {} },
  );
  assert.equal(metrics.sourcePinned, 0);
  assert.equal(metrics.missingPreviews, 1);
  assert.equal(metrics.dependenciesDeclared, 0);
  assert.equal(metrics.compatibilityDeclared, 0);
  const fabricatedLabel = measureAsset(
    {
      ...asset,
      preview: {
        kind: 'image',
        url: 'https://other.example/image.webp',
        label: 'Official capture verified',
      },
    },
    { captures: {}, live: {} },
  );
  assert.equal(fabricatedLabel.officialCaptures, 0);
  assert.equal(fabricatedLabel.upstreamImages, 1);
});
test('coverage totals reflect published assets, real media and approved sources', async () => {
  const { db, registry } = await setup();
  try {
    const report = await coverage(registry);
    assert.equal(report.metrics.total, (await approvedCapturedAssets()).length);
    assert.equal(report.sources.length, PROVIDERS.filter((provider) => provider.approved).length);
    assert.equal(
      report.sources.reduce((n, p) => n + p.metrics.total, 0),
      report.metrics.total,
    );
    assert.equal(report.upstreamStatus, 'not-checked');
    assert.ok(report.metrics.officialCaptures > 0);
    assert.ok(report.metrics.pinnedLiveDemos > 0);
    assert.equal(
      report.metrics.fresh + report.metrics.ageing + report.metrics.stale + report.metrics.unknown,
      report.metrics.total,
    );
    await registry.putProvider({ ...PROVIDERS[0], approved: false });
    const hidden = await coverage(registry);
    assert.ok(hidden.metrics.total < report.metrics.total);
    assert.ok(!hidden.sources.some((p) => p.id === PROVIDERS[0].id));
  } finally {
    await db.close();
  }
});
test('verified provider-hosted embeds are not counted as missing previews', async () => {
  const animata = (await capturedAssets()).find((asset) => asset.providerId === 'animata')!;
  const metrics = measureAsset(animata, { captures: {}, live: {} });
  assert.equal(metrics.missingPreviews, 0);
  assert.equal(metrics.upstreamImages, 0);
});
test('collection drafts are private and publishing is a distinct revision-checked action', async () => {
  const { db, registry } = await setup();
  try {
    const saved = (await saveCollection(registry, draft, 'curator')) as CollectionRecord;
    assert.equal(saved.revision, 1);
    assert.equal((await listCollections(registry)).total, 0);
    await assert.rejects(getCollection(registry, draft.slug), { code: 'NOT_FOUND' });
    const published = (await publishCollection(
      registry,
      { slug: draft.slug, expectedRevision: 1, decision: 'publish', reason },
      'curator',
    )) as CollectionRecord;
    assert.equal(published.revision, 2);
    assert.equal((await listCollections(registry)).total, 1);
    await saveCollection(
      registry,
      { ...draft, title: 'Unpublished editorial rewrite', expectedRevision: 2 },
      'curator',
    );
    assert.equal((await getCollection(registry, draft.slug)).title, draft.title);
    assert.equal(
      (await getCollection(registry, draft.slug, true)).title,
      'Unpublished editorial rewrite',
    );
    await assert.rejects(
      publishCollection(
        registry,
        { slug: draft.slug, expectedRevision: 2, decision: 'publish', reason },
        'curator',
      ),
      { code: 'CONFLICT' },
    );
    await publishCollection(
      registry,
      { slug: draft.slug, expectedRevision: 3, decision: 'unpublish', reason },
      'curator',
    );
    assert.equal((await listCollections(registry)).total, 0);
  } finally {
    await db.close();
  }
});
test('concurrent collection edits preserve one winner, item order and a single audit change', async () => {
  const { db, registry } = await setup();
  try {
    await saveCollection(registry, draft, 'curator');
    const outcomes = await Promise.allSettled([
      saveCollection(registry, { ...draft, title: 'Edit one', expectedRevision: 1 }, 'one'),
      saveCollection(
        registry,
        { ...draft, title: 'Edit two', items: [...draft.items].reverse(), expectedRevision: 1 },
        'two',
      ),
    ]);
    assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 1);
    const stored = await getCollection(registry, draft.slug, true);
    const items = await db.query(
      'SELECT target_id FROM uixo_v2_collection_items WHERE collection_slug=$1 ORDER BY position',
      [draft.slug],
    );
    assert.deepEqual(
      items.map((i) => i.target_id),
      stored.items.map((i) => i.targetId),
    );
    assert.equal(
      (await db.query("SELECT id FROM uixo_v2_audit WHERE action='collection-save'")).length,
      2,
    );
  } finally {
    await db.close();
  }
});
test('collection validation rejects unknown references, duplicate items and typed confusion', async () => {
  const { db, registry } = await setup();
  try {
    await assert.rejects(
      saveCollection(registry, { ...draft, items: [draft.items[0], draft.items[0]] }, 'curator'),
      { code: 'INVALID_INPUT' },
    );
    await assert.rejects(
      saveCollection(
        registry,
        { ...draft, items: [{ ...draft.items[0], targetId: 'missing/asset' }] },
        'curator',
      ),
      { code: 'INVALID_REFERENCE' },
    );
    await assert.rejects(
      saveCollection(
        registry,
        { ...draft, items: [{ kind: 'website', targetId: 'x' }] },
        'curator',
      ),
      { code: 'INVALID_INPUT' },
    );
    await assert.rejects(saveCollection(registry, { ...draft, slug: '../x' }, 'curator'), {
      code: 'INVALID_INPUT',
    });
  } finally {
    await db.close();
  }
});
test('provider revocation hides collection members and prevents stale publication', async () => {
  const { db, registry } = await setup();
  try {
    await saveCollection(registry, draft, 'curator');
    await publishCollection(
      registry,
      { slug: draft.slug, expectedRevision: 1, decision: 'publish', reason },
      'curator',
    );
    await registry.putProvider({ ...PROVIDERS.find((p) => p.id === 'shadcn')!, approved: false });
    const result = await getCollection(registry, draft.slug);
    assert.equal(result.items.length, 0);
    assert.equal('unavailableItems' in result && result.unavailableItems, 2);
    await assert.rejects(
      publishCollection(
        registry,
        { slug: draft.slug, expectedRevision: 2, decision: 'publish', reason },
        'curator',
      ),
      { code: 'CONFLICT' },
    );
  } finally {
    await db.close();
  }
});
test('starter collections are repeatable drafts rather than automatic editorial publications', async () => {
  const { db, registry } = await setup();
  try {
    assert.equal((await seedCollectionDrafts(registry)).inserted, 6);
    assert.equal((await seedCollectionDrafts(registry)).inserted, 0);
    assert.equal((await listCollections(registry)).total, 0);
  } finally {
    await db.close();
  }
});
test('structured issue parser rejects approval fields, ambiguous blocks and mismatched identities', () => {
  assert.equal(parseGithubIssue(issue()).item.url, 'https://ui.shadcn.com/');
  assert.throws(() => parseGithubIssue(issue(undefined, 1, { publish: true })), {
    code: 'INVALID_INPUT',
  });
  assert.throws(() => parseGithubIssue({ ...issue(), body: issue().body + '\n' + issue().body }), {
    code: 'INVALID_INPUT',
  });
  assert.throws(
    () => parseGithubIssue({ ...issue(), url: 'https://github.com/another/repo/issues/1' }),
    { code: 'INVALID_INPUT' },
  );
  assert.throws(() => parseGithubIssue(issue('javascript:alert(1)')), { code: 'INVALID_INPUT' });
});
test('Grok delivery is idempotent by issue and canonical URL and never publishes', async () => {
  const { db, registry } = await setup(false);
  try {
    const first = await ingestGithubIssue(
      registry,
      issue('https://www.example.com/?utm_source=x'),
      'scout',
    );
    const second = await ingestGithubIssue(registry, issue('https://example.com/'), 'scout');
    assert.equal(second.candidateId, first.candidateId);
    assert.equal(second.duplicate, true);
    const otherIssue = await ingestGithubIssue(registry, issue('https://example.com/', 2), 'scout');
    assert.equal(otherIssue.candidateId, first.candidateId);
    assert.equal(otherIssue.created, false);
    await assert.rejects(
      ingestGithubIssue(registry, issue('https://different.example/'), 'scout'),
      { code: 'ISSUE_IDENTITY_CHANGED' },
    );
    assert.equal((await operations(registry)).total, 1);
    assert.equal((await registry.stats()).assets, 0);
    assert.equal((await candidateDetail(registry, first.candidateId)).deliveries.length, 2);
  } finally {
    await db.close();
  }
});
test('concurrent duplicate Grok deliveries yield one candidate and one immutable receipt', async () => {
  const { db, registry } = await setup(false);
  try {
    const receipts = await Promise.all(
      Array.from({ length: 6 }, () => ingestGithubIssue(registry, issue(), 'scout')),
    );
    assert.equal(new Set(receipts.map((r) => r.candidateId)).size, 1);
    assert.equal(receipts.filter((r) => !r.duplicate).length, 1);
    assert.equal((await db.query('SELECT id FROM uixo_v2_scout_deliveries')).length, 1);
  } finally {
    await db.close();
  }
});
test('pipeline derives actual review and current publication from exact job revisions', async () => {
  const { db, registry } = await setup(false);
  try {
    await registry.putProvider(PROVIDERS[0]);
    const c = await candidate(registry);
    await assert.rejects(
      investigateCandidate(registry, { id: c.id, expectedRevision: 0 }, 'worker'),
      { code: 'PROVIDER_REVIEW_REQUIRED' },
    );
    await updateCandidate(
      registry,
      { id: c.id, expectedRevision: 0, decision: 'link', providerId: PROVIDERS[0].id, reason },
      'curator',
    );
    const job = await investigateCandidate(registry, { id: c.id, expectedRevision: 1 }, 'worker');
    assert.equal((await candidateDetail(registry, c.id)).candidate.stage, 'investigating');
    const a = (await capturedAssets())[0];
    await runJob(registry, job.id, async () => [a]);
    const detail = await candidateDetail(registry, c.id);
    assert.equal(detail.candidate.stage, 'review');
    assert.equal(detail.revisions.length, 1);
    assert.equal((await registry.search({})).total, 0);
    await registry.review(detail.revisions[0].id, 'approve', 'curator', reason);
    assert.equal((await candidateDetail(registry, c.id)).candidate.stage, 'published');
    await registry.putProvider({ ...PROVIDERS[0], approved: false });
    assert.equal((await candidateDetail(registry, c.id)).candidate.stage, 'blocked');
  } finally {
    await db.close();
  }
});
test('candidate CAS and provider job deduplication do not leave orphan jobs', async () => {
  const { db, registry } = await setup(false);
  try {
    await registry.putProvider(PROVIDERS[0]);
    const c = await candidate(registry);
    await updateCandidate(
      registry,
      { id: c.id, expectedRevision: 0, decision: 'link', providerId: PROVIDERS[0].id, reason },
      'curator',
    );
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        investigateCandidate(registry, { id: c.id, expectedRevision: 1 }, 'worker'),
      ),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await db.query('SELECT id FROM uixo_v2_jobs')).length, 1);
    assert.equal((await db.query('SELECT job_id FROM uixo_v2_candidate_jobs')).length, 1);
    await assert.rejects(
      updateCandidate(
        registry,
        { id: c.id, expectedRevision: 2, decision: 'reject', reason },
        'curator',
      ),
      { code: 'CONFLICT' },
    );
  } finally {
    await db.close();
  }
});
test('cancellation during a remote index fetch cannot be overwritten by the worker', async () => {
  const { db, registry } = await setup(false);
  try {
    await registry.putProvider(PROVIDERS[0]);
    const job = await enqueue(registry, PROVIDERS[0].id);
    let start!: () => void, resume!: () => void;
    const started = new Promise<void>((r) => {
        start = r;
      }),
      resumed = new Promise<void>((r) => {
        resume = r;
      });
    const run = runJob(registry, job.id, async () => {
      start();
      await resumed;
      return [(await capturedAssets())[0]];
    });
    const rejected = assert.rejects(run, { code: 'LEASE_LOST' });
    await started;
    await cancelJob(registry, { id: job.id, reason }, 'curator');
    resume();
    await rejected;
    assert.equal(
      (await db.query('SELECT status FROM uixo_v2_jobs WHERE id=$1', [job.id]))[0].status,
      'cancelled',
    );
    assert.equal((await registry.queue()).total, 0);
    assert.equal((await registry.stats()).assets, 0);
  } finally {
    await db.close();
  }
});
test('candidate rejection and reopening require current revisions and retain audit history', async () => {
  const { db, registry } = await setup(false);
  try {
    const c = await candidate(registry);
    await updateCandidate(
      registry,
      { id: c.id, expectedRevision: 0, decision: 'reject', reason },
      'curator',
    );
    assert.equal((await candidateDetail(registry, c.id)).candidate.stage, 'rejected');
    await assert.rejects(
      updateCandidate(
        registry,
        { id: c.id, expectedRevision: 0, decision: 'reopen', reason },
        'curator',
      ),
      { code: 'CONFLICT' },
    );
    const reopened = await updateCandidate(
      registry,
      { id: c.id, expectedRevision: 1, decision: 'reopen', reason },
      'curator',
    );
    assert.equal(reopened.candidate.stage, 'discovered');
    assert.equal(reopened.history.length, 2);
  } finally {
    await db.close();
  }
});
test('HTTP rejects unauthorised intelligence writes and keeps worker/scout boundaries', async () => {
  const { db, registry } = await setup();
  const options = {
    origin: '',
    authenticate: async (req: { headers: { authorization?: string } }) => {
      const role = req.headers.authorization;
      return ['curator', 'worker', 'scout'].includes(role ?? '')
        ? { id: role!, role: role as 'curator' | 'worker' | 'scout' }
        : null;
    },
  };
  const handler = createRegistryHandler(registry, options);
  const server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  options.origin = `http://127.0.0.1:${addr.port}`;
  async function api(action: string, role?: string, body?: unknown) {
    const res = await fetch(options.origin + '/api/registry?action=' + action, {
      method: body ? 'POST' : 'GET',
      headers: { ...(role ? { authorization: role } : {}), 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }
  try {
    for (const action of [
      'coverage',
      'operations',
      'candidate',
      'revision',
      'collections-editor',
      'collection-editor',
    ])
      assert.equal((await api(action)).status, 401, action);
    for (const action of [
      'collection-save',
      'collection-publish',
      'candidate-update',
      'scout-github',
    ])
      assert.equal((await api(action, 'worker', {})).status, 401, action);
    assert.equal((await api('coverage', 'worker')).status, 200);
    assert.equal((await api('collections')).status, 200);
    assert.equal((await api('source-health&provider=shadcn')).status, 200);
    assert.equal((await api('source-health&provider=shadcn')).data.upstreamStatus, 'not-checked');
    assert.equal((await api('operations', 'scout')).status, 401);
    assert.equal((await api('scout-github', 'scout', issue())).status, 200);
    assert.equal((await api('collection-save', 'curator', draft)).status, 200);
    assert.equal((await api('collection-save', 'curator', draft)).status, 409);
    assert.equal((await api('collection-save', 'curator')).status, 405);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  }
});
test('snapshot service rejects editorial and intake mutations even with a supplied actor', async () => {
  const { db, registry } = await setup(true, true);
  try {
    await assert.rejects(saveCollection(registry, draft, 'curator'), {
      code: 'READ_ONLY_SNAPSHOT',
    });
    await assert.rejects(ingestGithubIssue(registry, issue(), 'scout'), {
      code: 'READ_ONLY_SNAPSHOT',
    });
    assert.equal((await operations(registry)).readOnly, true);
  } finally {
    await db.close();
  }
});
test('issue bridge requires approved authors, a candidate label and a fixed trusted origin', async () => {
  const i = issue(),
    event = {
      repository: { full_name: i.repository },
      issue: {
        ...i,
        html_url: i.url,
        user: { login: i.author },
        labels: [{ name: 'uixo-candidate' }],
      },
    };
  let calls = 0;
  const cfg = {
    origin: 'https://registry.example',
    token: 's'.repeat(40),
    repository: i.repository,
    authors: [i.author],
    fetchImpl: async (url: unknown, init?: RequestInit) => {
      calls++;
      assert.equal(String(url), 'https://registry.example/api/registry?action=scout-github');
      assert.equal(init?.redirect, 'manual');
      return new Response(
        JSON.stringify({
          candidateId: '12345678-1234-1234-1234-123456789012',
          published: 0,
          duplicate: false,
        }),
      );
    },
  };
  await assert.rejects(deliverIssue(event, { ...cfg, authors: [] }), /approved scout/);
  await assert.rejects(
    deliverIssue(event, { ...cfg, origin: 'https://registry.example/other' }),
    /trusted HTTPS/,
  );
  assert.equal(calls, 0);
  assert.equal((await deliverIssue(event, cfg)).published, 0);
  assert.equal(calls, 1);
});
