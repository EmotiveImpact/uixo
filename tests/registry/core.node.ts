import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { capturedAssets, seedCaptured } from '../../registry/bootstrap.ts';
import { parseSearch, validateAsset, canonicalUrl, parseScout } from '../../registry/domain.ts';
import {
  resolveAsset,
  checkCompatibility,
  satisfies,
  tokenMatches,
} from '../../registry/policy.ts';
import { FetchBudget } from '../../registry/fetcher.ts';
import { enqueue, runJob } from '../../registry/jobs.ts';
import { PROVIDERS, parseShadcnManifest } from '../../registry/providers.ts';

async function setup() {
  const db = await sqliteDatabase();
  await migrate(db);
  const registry = new Registry(db);
  return { db, registry };
}

test('migration and captured-source seed are repeatable; counts reflect actual rows', async () => {
  const { db, registry } = await setup();
  try {
    await migrate(db);
    const first = await seedCaptured(registry),
      second = await seedCaptured(registry);
    assert.equal(first.inserted, 67);
    assert.equal(second.inserted, 0);
    assert.equal((await registry.stats()).assets, 67);
    assert.equal((await registry.providers()).length, 3);
  } finally {
    await db.close();
  }
});
test('publication is a separate atomic review gate; edits do not replace live records', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0],
      draft = await registry.stage(asset);
    assert.equal((await registry.search({})).total, 0);
    assert.equal((await registry.queue()).total, 1);
    await registry.review(draft.id, 'approve', 'test-curator', 'Source and licence inspected.');
    assert.equal((await registry.search({})).total, 1);
    await registry.stage({ ...asset, name: 'A changed name' });
    assert.equal((await registry.inspect(asset.id)).name, asset.name);
    await assert.rejects(
      registry.review(draft.id, 'approve', 'other', 'Duplicate review'),
      /already reviewed/,
    );
  } finally {
    await db.close();
  }
});
test('rejection and unapproved-provider blocks do not leak draft assets into search', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0];
    const draft = await registry.stage(asset);
    await registry.review(draft.id, 'reject', 'curator', 'Not selected.');
    assert.equal((await registry.search({})).total, 0);
    await registry.putProvider({ ...PROVIDERS[0], approved: false });
    await assert.rejects(registry.stage({ ...asset, name: 'changed' }), /Approved provider/);
  } finally {
    await db.close();
  }
});
test('search enforces framework and format on the same variant and excludes unknown licences', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    assert.equal((await registry.search({ framework: 'react', format: 'svg' })).total, 0);
    assert.equal(
      (await registry.search({ q: 'find me a free React sidebar', commercial: true })).total,
      1,
    );
    assert.equal((await registry.search({ q: 'react radar whichdoesnotexist' })).total, 0);
    const first = await registry.search({ kind: 'component', limit: 5 });
    const second = await registry.search({ kind: 'component', limit: 5, offset: 5 });
    assert.equal(first.items.length, 5);
    assert.equal(new Set([...first.items, ...second.items].map((a) => a.id)).size, 10);
  } finally {
    await db.close();
  }
});
test('search rejects invalid bounds and normalises intent without inventing semantics', () => {
  assert.throws(() => parseSearch({ limit: -1 }));
  assert.throws(() => parseSearch({ limit: '3x' }));
  assert.throws(() => parseSearch({ commercial: 'yes' }));
  const parsed = parseSearch({ q: 'Find me free React sidebar components' });
  assert.equal(parsed.framework, 'react');
  assert.equal(parsed.price, 'free');
  assert.deepEqual(parsed.terms, ['sidebar']);
});
test('unsafe metadata, identifiers, URLs and unsupported licence certainty are rejected', async () => {
  const asset = (await capturedAssets())[0];
  for (const sourceUrl of [
    'http://example.com',
    'https://127.0.0.1/',
    'https://user:pass@example.com/',
    'javascript:alert(1)',
  ])
    assert.throws(() => validateAsset({ ...asset, sourceUrl }));
  assert.throws(() => validateAsset({ ...asset, id: '../admin' }));
  assert.throws(() => validateAsset({ ...asset, licence: { ...asset.licence, text: '' } }));
});
test('acquisition blocks unknown, restricted and stale licences; never executes', async () => {
  const asset = (await capturedAssets())[0];
  const ready = resolveAsset(asset);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.executed, false);
  assert.equal(
    resolveAsset({ ...asset, licence: { ...asset.licence, redistribution: 'unknown' } }).status,
    'blocked',
  );
  assert.equal(
    resolveAsset({ ...asset, licence: { ...asset.licence, checkedAt: '2020-01-01T00:00:00.000Z' } })
      .status,
    'blocked',
  );
  const paid = {
    ...asset,
    variants: [
      {
        ...asset.variants[0],
        acquisition: { kind: 'purchase' as const, url: 'https://example.com/buy' },
      },
    ],
  };
  assert.equal(resolveAsset(paid).status, 'external');
  assert.throws(() =>
    resolveAsset({
      ...asset,
      variants: [
        {
          ...asset.variants[0],
          acquisition: { kind: 'registry', url: 'https://evil.example/r/code' },
        },
      ],
    }),
  );
});
test('compatibility is conservative about missing packages and unsupported ranges', async () => {
  const asset = (await capturedAssets())[0];
  assert.equal(checkCompatibility(asset, { framework: 'vue' }).status, 'incompatible');
  assert.equal(checkCompatibility(asset, { framework: 'react' }).status, 'requires-change');
  assert.equal(
    checkCompatibility(asset, { framework: 'react', packages: { 'radix-ui': '1.0.0' } }).status,
    'unknown',
  );
  assert.equal(satisfies('19.1.0', '^19.0.0'), true);
  assert.equal(satisfies('20.0.0', '^19.0.0'), false);
  assert.equal(satisfies('0.3.0', '^0.2.0'), false);
  assert.equal(satisfies('19.1.0', '>=18.0.0 <20.0.0'), true);
  assert.equal(satisfies('19.1.0-beta', '^19.0.0'), null);
  assert.equal(satisfies('19.1.0', 'workspace:*'), null);
});
test('Grok intake is idempotent, canonicalised and never publishes', async () => {
  const { db, registry } = await setup();
  try {
    const input = {
      items: [
        {
          name: 'Source',
          url: 'https://www.example.com/?utm_source=x',
          postUrl: 'https://x.com/creator/status/123',
          creator: 'creator',
          note: 'Found on X',
        },
      ],
    };
    assert.equal((await registry.scout(input)).inserted, 1);
    assert.equal((await registry.scout(input)).duplicates, 1);
    assert.equal((await registry.stats()).assets, 0);
    assert.equal(canonicalUrl('https://example.com/?utm_campaign=test'), 'https://example.com/');
    assert.throws(() => parseScout({ items: [] }));
  } finally {
    await db.close();
  }
});
test('indexing jobs persist status, deduplicate drafts and enforce claim ownership', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const assets = [(await capturedAssets())[0]];
    const job = await enqueue(registry, 'shadcn');
    await assert.rejects(enqueue(registry, 'shadcn'), /active job/);
    const result = await runJob(registry, job.id, async () => assets);
    assert.equal(result.staged, 1);
    assert.equal(result.published, 0);
    await assert.rejects(runJob(registry, job.id), { code: 'JOB_NOT_CLAIMABLE' });
    const next = await enqueue(registry, 'shadcn');
    assert.equal((await runJob(registry, next.id, async () => assets)).duplicates, 1);
    const failed = await enqueue(registry, 'shadcn');
    await assert.rejects(
      runJob(registry, failed.id, async () => {
        throw new Error('secret upstream credential');
      }),
    );
    const row = (
      await db.query('SELECT status,error FROM uixo_v2_jobs WHERE id=$1', [failed.id])
    )[0];
    assert.equal(row.status, 'retry');
    assert.equal(row.error, 'INDEX_FAILED');
  } finally {
    await db.close();
  }
});
test('remote fetching limits hosts, redirects, response size and request counts', async () => {
  let calls = 0;
  const budget = new FetchBudget({
    requests: 1,
    fetchImpl: async () => {
      calls++;
      return new Response('{}');
    },
  });
  await assert.rejects(budget.json('https://169.254.169.254/metadata'), /not approved/);
  await budget.json('https://api.github.com/repos/a/b');
  assert.equal(calls, 1);
  await assert.rejects(budget.json('https://api.github.com/repos/a/b'), /budget/);
  await assert.rejects(
    new FetchBudget({ fetchImpl: async () => new Response('', { status: 302 }) }).text(
      'https://ui.shadcn.com/r/test.json',
    ),
    /redirects/,
  );
  await assert.rejects(
    new FetchBudget({ maxBytes: 2, fetchImpl: async () => new Response('too long') }).text(
      'https://api.github.com/repos/a/b',
    ),
    /byte budget/,
  );
});
test('manifest parser never executes upstream source and rejects unknown layouts', () => {
  const parsed = parseShadcnManifest(
    'export const items = [\n  {\n    name: "button",\n    dependencies: ["radix-ui"],\n  },\n]',
  );
  assert.deepEqual(parsed[0], {
    name: 'button',
    dependencies: ['radix-ui'],
    registryDependencies: [],
  });
  assert.throws(() => parseShadcnManifest('process.exit(1)'));
});
test('scoped token comparison fails closed and rejects short secrets', () => {
  const token = 'x'.repeat(32);
  assert.equal(tokenMatches(token, token), true);
  assert.equal(tokenMatches('x', 'x'), false);
  assert.equal(tokenMatches(token, undefined), false);
  assert.equal(tokenMatches('y'.repeat(32), token), false);
});

test('a stale revision cannot overwrite a separately approved edit', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const asset = await registry.inspect('shadcn/accordion');
    const first = await registry.stage({ ...asset, name: 'First curator edit' }),
      second = await registry.stage({ ...asset, name: 'Second curator edit' });
    await registry.review(first.id, 'approve', 'curator-one', 'Inspected the proposed first edit.');
    await assert.rejects(
      registry.review(second.id, 'approve', 'curator-two', 'Attempt to approve stale base.'),
      /changed/,
    );
    assert.equal((await registry.inspect(asset.id)).name, 'First curator edit');
  } finally {
    await db.close();
  }
});
test('re-seeding preserves curator edits and provider revocation', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const asset = await registry.inspect('shadcn/accordion');
    const proposed = await registry.stage({ ...asset, name: 'Editorially corrected name' });
    await registry.review(
      proposed.id,
      'approve',
      'test',
      'Keep the inspected metadata correction.',
    );
    await registry.putProvider({ ...PROVIDERS[1], approved: false });
    await seedCaptured(registry);
    assert.equal((await registry.inspect(asset.id)).name, 'Editorially corrected name');
    await assert.rejects(registry.provider('lucide'), /not found/);
    assert.equal((await registry.search({ provider: 'lucide' })).total, 0);
  } finally {
    await db.close();
  }
});
test('continuation runs keep the provider revision and do not repeat page one', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0],
      ref = 'a'.repeat(40);
    const first = await enqueue(registry, 'shadcn');
    await runJob(registry, first.id, async () => ({
      assets: [asset],
      offset: 0,
      total: 2,
      nextOffset: 1,
      sourceRef: ref,
    }));
    const next = await enqueue(registry, 'shadcn', first.id);
    let supplied;
    await runJob(registry, next.id, async (_id, options) => {
      supplied = options;
      return { assets: [], offset: 1, total: 2, nextOffset: null, sourceRef: ref };
    });
    assert.deepEqual(supplied, { offset: 1, sourceRef: ref });
    await assert.rejects(enqueue(registry, 'shadcn', next.id), /remaining page/);
  } finally {
    await db.close();
  }
});
