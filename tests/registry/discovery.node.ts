import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { seedCaptured } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import {
  listCollections,
  getCollection,
  publishCollection,
  seedCollectionDrafts,
} from '../../registry/collections.ts';
import {
  bootstrapSnapshotCollections,
  publishNewStarterCollections,
} from '../../registry/release-collections.ts';
import { intelligenceReadiness } from '../../registry/readiness.ts';
import { createRegistryHandler } from '../../registry/http.ts';
import type { PublicCollection } from '../../shared/intelligence.ts';

async function setup(snapshot = false) {
  const db = await sqliteDatabase(':memory:', snapshot);
  await migrate(db);
  const registry = new Registry(db);
  await seedCaptured(registry);
  return { db, registry };
}

test('release snapshot contains six real selections and remains idempotent', async () => {
  const { db, registry } = await setup(true);
  try {
    assert.equal((await bootstrapSnapshotCollections(registry)).published, 6);
    assert.equal((await bootstrapSnapshotCollections(registry)).published, 0);
    assert.equal((await listCollections(registry)).total, 6);
    const collection = (await getCollection(registry, 'dashboard-foundations')) as PublicCollection;
    assert.equal(collection.items.length, 5);
    assert.equal(collection.unavailableItems, 0);
    assert.equal(collection.items[0].asset?.id, 'shadcn/sidebar');
    assert.equal(collection.items[0].providerId, 'shadcn');
    assert.equal(collection.items[0].providerName, 'shadcn/ui');
    assert.ok(collection.items[0].frameworks?.includes('react'));
    assert.ok(collection.items[0].licenceExpression);
    assert.equal((await registry.stats()).assets, 1437);
    await assert.rejects(
      publishCollection(
        registry,
        {
          slug: collection.slug,
          expectedRevision: 1,
          decision: 'unpublish',
          reason: 'A visitor must never change a snapshot.',
        },
        'visitor',
      ),
      { code: 'READ_ONLY_SNAPSHOT' },
    );
  } finally {
    await db.close();
  }
});

test('snapshot initialisation cannot target persistent storage; starter preparation is draft-only', async () => {
  const { db, registry } = await setup();
  try {
    await assert.rejects(bootstrapSnapshotCollections(registry), { code: 'SNAPSHOT_ONLY' });
    const seeded = await seedCollectionDrafts(registry);
    assert.equal(seeded.inserted, 6);
    assert.equal(seeded.published, 0);
    assert.deepEqual(seeded.skipped, []);
    assert.equal((await listCollections(registry)).total, 0);
    assert.equal((await seedCollectionDrafts(registry)).inserted, 0);
    assert.equal(
      (
        await publishNewStarterCollections(
          registry,
          'local-test-curator',
          'Existing drafts must remain private.',
        )
      ).published,
      0,
    );
    assert.equal((await listCollections(registry)).total, 0);
  } finally {
    await db.close();
  }
});

test('explicit operator publication leaves existing withdrawals and edits untouched', async () => {
  const { db, registry } = await setup();
  try {
    assert.equal(
      (
        await publishNewStarterCollections(
          registry,
          'local-test-curator',
          'Review the source-backed starter selections.',
        )
      ).published,
      6,
    );
    const collection = await getCollection(registry, 'dashboard-foundations');
    await publishCollection(
      registry,
      {
        slug: collection.slug,
        expectedRevision: collection.revision,
        decision: 'unpublish',
        reason: 'Withdraw this selection for a new editorial review.',
      },
      'local-test-curator',
    );
    const again = await publishNewStarterCollections(
      registry,
      'local-test-curator',
      'Rerunning must not restore withdrawn collections.',
    );
    assert.equal(again.published, 0);
    assert.equal(again.skipped.length, 6);
    assert.equal((await listCollections(registry)).total, 5);
    await assert.rejects(getCollection(registry, collection.slug), { code: 'NOT_FOUND' });
  } finally {
    await db.close();
  }
});

test('revoked source metadata and component previews are withheld from public selections', async () => {
  const { db, registry } = await setup();
  try {
    await publishNewStarterCollections(
      registry,
      'local-test-curator',
      'Prepare a reviewed selection for revocation acceptance.',
    );
    await registry.putProvider({
      ...PROVIDERS.find((provider) => provider.id === 'shadcn')!,
      approved: false,
    });
    const collection = (await getCollection(registry, 'dashboard-foundations')) as PublicCollection;
    assert.deepEqual(collection.items, []);
    assert.equal(collection.unavailableItems, 5);
    assert.equal(JSON.stringify(collection).includes('shadcn/sidebar'), false);
  } finally {
    await db.close();
  }
});

test('starter preparation skips unavailable selections instead of fabricating members', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider({
      ...PROVIDERS.find((provider) => provider.id === 'shadcn')!,
      approved: false,
    });
    const result = await seedCollectionDrafts(registry);
    assert.equal(result.inserted, 1);
    assert.equal(result.skipped.length, 5);
    assert.equal((await listCollections(registry)).total, 0);
  } finally {
    await db.close();
  }
});

test('readiness detects the missing additive schema without migrating it', async () => {
  const { db, registry } = await setup();
  try {
    assert.equal((await intelligenceReadiness(registry)).ready, true);
    await db.query('DROP TABLE uixo_v2_github_issues');
    assert.equal((await intelligenceReadiness(registry)).ready, false);
    assert.equal(
      (await db.query("SELECT name FROM sqlite_master WHERE name='uixo_v2_github_issues'")).length,
      0,
    );
  } finally {
    await db.close();
  }
});

test('public source directory and private starter preparation keep their HTTP boundaries', async () => {
  const { db, registry } = await setup();
  const options = {
    origin: '',
    authenticate: async (req: { headers: { authorization?: string } }) => {
      const role = req.headers.authorization;
      return role === 'curator' || role === 'worker' ? { id: role, role } : null;
    },
  };
  const handler = createRegistryHandler(registry, options);
  const server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  options.origin = 'http://127.0.0.1:' + address.port;
  const api = async (action: string, role?: string, post = false) => {
    const response = await fetch(options.origin + '/api/registry?action=' + action, {
      method: post ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...(role ? { authorization: role } : {}) },
      body: post ? '{}' : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const sources = await api('source-directory');
    assert.equal(sources.status, 200);
    assert.equal(sources.data.items.length, 12);
    assert.ok(
      sources.data.items.every(
        (source: { metrics: { total: number }; upstreamStatus: string }) =>
          source.metrics.total > 0 && source.upstreamStatus === 'not-checked',
      ),
    );
    assert.equal((await api('collection-starters', undefined, true)).status, 401);
    assert.equal((await api('collection-starters', 'worker', true)).status, 401);
    assert.equal((await api('collection-starters', 'curator', true)).data.inserted, 6);
    assert.equal((await api('collections')).data.total, 0);
    const status = await api('status');
    assert.equal(status.data.release, 'discovery-v2');
    assert.equal(status.data.intelligence.ready, true);
    assert.equal(status.data.role, 'visitor');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  }
});
