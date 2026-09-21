import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { seedCaptured, capturedAssets } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { coverage } from '../../registry/intelligence.ts';
import {
  sourceDirectory,
  publicSourceHealth,
  SOURCE_DIRECTORY_POLICY,
} from '../../registry/source-directory.ts';
import { createRegistryHandler } from '../../registry/http.ts';

async function setup() {
  const db = await sqliteDatabase(':memory:');
  await migrate(db);
  const registry = new Registry(db);
  await seedCaptured(registry);
  return { db, registry };
}
/** Scale fixtures intentionally have no parseable evidence; large sources must never scan it. */
async function largeSource(registry: Registry, id: string, count: number, approved = true) {
  await registry.putProvider({ ...PROVIDERS[0], id, name: id, approved });
  const licence = (
    await registry.db.query('SELECT id FROM uixo_v2_licences ORDER BY id LIMIT 1')
  )[0].id;
  await registry.db.query(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<$1)
    INSERT INTO uixo_v2_assets(id,provider_id,slug,name,kind,price,source_url,licence_id,search_text,payload,fingerprint,updated_at)
    SELECT $2 || '/' || i,$2,'item-' || i,'Scale item','component','free','https://example.test/',
      $3,'scale fixture','{}','scale-' || i,'2026-09-19T00:00:00Z' FROM n`,
    [count, id, String(licence)],
  );
}

test('public source measurements match the existing complete report for the captured catalogue', async () => {
  const { db, registry } = await setup();
  try {
    const directory = await sourceDirectory(registry);
    const report = await coverage(registry);
    assert.equal(directory.total, 10);
    assert.equal(directory.nextOffset, null);
    assert.equal(
      directory.items.reduce((sum, s) => sum + s.assetCount, 0),
      1284,
    );
    for (const item of directory.items) {
      assert.equal(item.evidenceStatus, 'complete');
      assert.equal(item.evidenceNote, null);
      const original = report.sources.find((s) => s.id === item.id)!;
      assert.deepEqual(item.metrics, original.metrics);
      assert.deepEqual(item.frameworks, original.frameworks);
      assert.deepEqual(item.licences, original.licences);
    }
  } finally {
    await db.close();
  }
});

test('public directory and profile survive a single source above 10,000 assets with bounded reads', async () => {
  const { db, registry } = await setup();
  try {
    await largeSource(registry, 'large-provider', 10001);
    const calls: { sql: string; rows: number }[] = [];
    registry.db = {
      ...db,
      async query(sql, args) {
        const rows = await db.query(sql, args);
        calls.push({ sql, rows: rows.length });
        return rows;
      },
    };
    const directory = await sourceDirectory(registry);
    assert.equal(directory.total, 11);
    const large = directory.items.find((s) => s.id === 'large-provider')!;
    assert.equal(large.assetCount, 10001);
    assert.equal(large.metrics, null);
    assert.equal(large.evidenceStatus, 'deferred');
    assert.match(large.evidenceNote!, /not calculated/);
    assert.ok(calls.length <= 3);
    assert.ok(calls.every((q) => q.rows <= SOURCE_DIRECTORY_POLICY.maximumEvidenceAssets + 1));
    calls.length = 0;
    const profile = await publicSourceHealth(registry, 'large-provider');
    assert.equal(profile.assetCount, 10001);
    assert.equal(profile.metrics, null);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((q) => !q.sql.includes('SELECT a.id,a.provider_id,a.payload')));
    // This fix must not remove the deliberate curator reporting guard.
    registry.db = db;
    await assert.rejects(coverage(registry), { code: 'COVERAGE_LIMIT' });
  } finally {
    await db.close();
  }
});

test('multiple large sources do not break pagination or expose revoked providers', async () => {
  const { db, registry } = await setup();
  try {
    await largeSource(registry, 'scale-alpha', 6000);
    await largeSource(registry, 'scale-beta', 6000);
    await largeSource(registry, 'scale-revoked', 11000, false);
    const first = await sourceDirectory(registry, { q: 'scale-', limit: 1 });
    const second = await sourceDirectory(registry, { q: 'scale-', limit: 1, offset: 1 });
    assert.equal(first.total, 2);
    assert.equal(first.items[0].id, 'scale-alpha');
    assert.equal(first.nextOffset, 1);
    assert.equal(second.items[0].id, 'scale-beta');
    assert.equal(second.nextOffset, null);
    assert.equal(second.items[0].assetCount, 6000);
    await assert.rejects(publicSourceHealth(registry, 'scale-revoked'), { code: 'NOT_FOUND' });
  } finally {
    await db.close();
  }
});

test('source pagination bounds provider rows and searches beyond the first page', async () => {
  const { db, registry } = await setup();
  try {
    for (let i = 0; i < 60; i++) {
      const id = 'source-' + String(i).padStart(3, '0');
      await registry.putProvider({
        ...PROVIDERS[0],
        id,
        name: id,
        rationale: 'Pagination fixture.',
      });
    }
    const first = await sourceDirectory(registry, { limit: 12 });
    const second = await sourceDirectory(registry, { limit: 12, offset: 12 });
    assert.equal(first.total, 70);
    assert.equal(first.items.length, 12);
    assert.equal(new Set([...first.items, ...second.items].map((s) => s.id)).size, 24);
    const last = await sourceDirectory(registry, { q: 'source-059', limit: 1 });
    assert.equal(last.total, 1);
    assert.equal(last.items[0].id, 'source-059');
    assert.equal(last.items[0].metrics?.total, 0);
    const framework = await sourceDirectory(registry, { q: 'react' });
    assert.ok(framework.items.some((s) => s.id === 'shadcn'));
    const licence = await sourceDirectory(registry, { q: 'MIT' });
    assert.ok(licence.items.some((s) => s.id === 'shadcn'));
    assert.equal((await sourceDirectory(registry, { q: '%' })).total, 0);
    await assert.rejects(sourceDirectory(registry, { limit: 49 }), { code: 'INVALID_INPUT' });
    await assert.rejects(sourceDirectory(registry, { offset: -1 }), { code: 'INVALID_INPUT' });
    await assert.rejects(sourceDirectory(registry, { q: 'x'.repeat(121) }), {
      code: 'INVALID_INPUT',
    });
  } finally {
    await db.close();
  }
});

test('evidence budget is shared across the page and never silently samples a source', async () => {
  const { db, registry } = await setup();
  try {
    const template = (await capturedAssets())[0];
    for (let i = 0; i < 4; i++) {
      const id = 'budget-' + i;
      await largeSource(registry, id, 800);
      // Each stored payload is complete. Only the page budget may defer its report.
      await db.query(
        "UPDATE uixo_v2_assets SET payload=json_set($1,'$.id',id,'$.providerId',provider_id) WHERE provider_id=$2",
        [JSON.stringify(template), id],
      );
    }
    let payloadRows = 0;
    registry.db = {
      ...db,
      async query(sql, args) {
        const rows = await db.query(sql, args);
        if (sql.includes('SELECT a.id,a.provider_id,a.payload')) payloadRows += rows.length;
        return rows;
      },
    };
    const page = await sourceDirectory(registry, { q: 'budget-' });
    assert.equal(page.total, 4);
    assert.ok(payloadRows <= 2000);
    assert.equal(payloadRows, 1600);
    assert.deepEqual(
      page.items.map((s) => s.evidenceStatus),
      ['complete', 'complete', 'deferred', 'deferred'],
    );
    assert.ok(page.items.slice(0, 2).every((s) => s.metrics?.total === 800));
    assert.ok(page.items.slice(2).every((s) => s.metrics === null));
    // A narrower page can assess a formerly deferred source without changing its count.
    const next = await sourceDirectory(registry, { q: 'budget-', offset: 2, limit: 2 });
    assert.ok(next.items.every((s) => s.metrics?.total === 800));
    assert.ok(page.items.every((s) => s.assetCount === 800));
  } finally {
    await db.close();
  }
});

test('large public source HTTP responses stay available while private coverage stays protected', async () => {
  const { db, registry } = await setup();
  const options = { origin: '', authenticate: async () => null };
  const handler = createRegistryHandler(registry, options);
  const server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  options.origin = 'http://127.0.0.1:' + address.port;
  try {
    await largeSource(registry, 'http-large', 10001);
    for (const action of [
      'source-directory&q=http-large&limit=1',
      'source-health&provider=http-large',
    ]) {
      const response = await fetch(options.origin + '/api/registry?action=' + action);
      assert.equal(response.status, 200);
      const data = await response.json();
      const source = data.items ? data.items[0] : data;
      assert.equal(source.assetCount, 10001);
      assert.equal(source.metrics, null);
      assert.equal(source.evidenceStatus, 'deferred');
    }
    const privateResponse = await fetch(options.origin + '/api/registry?action=coverage');
    assert.equal(privateResponse.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  }
});
