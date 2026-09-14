import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { capturedAssets, seedCaptured } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { createRegistryHandler } from '../../registry/http.ts';

const tokens = {
  curator: 'test-curator-'.repeat(4),
  scout: 'test-scout-'.repeat(4),
  worker: 'test-worker-'.repeat(4),
};
async function setup(snapshot = false) {
  const saved = { ...process.env };
  process.env.UIXO_CURATOR_TOKEN = tokens.curator;
  process.env.UIXO_SCOUT_TOKEN = tokens.scout;
  process.env.UIXO_WORKER_TOKEN = tokens.worker;
  process.env.UIXO_AUTH_ISSUER = '';
  process.env.UIXO_AUTH_AUDIENCE = '';
  const db = await sqliteDatabase(':memory:', snapshot);
  await migrate(db);
  const registry = new Registry(db);
  const options = { origin: '' };
  const handler = createRegistryHandler(registry, options);
  const server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  options.origin = `http://127.0.0.1:${address.port}`;
  async function api(
    action: string,
    role?: keyof typeof tokens,
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await fetch(`${options.origin}/api/registry?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(role ? { authorization: `Bearer ${tokens[role]}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  async function close() {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
    for (const key of [
      'UIXO_CURATOR_TOKEN',
      'UIXO_SCOUT_TOKEN',
      'UIXO_WORKER_TOKEN',
      'UIXO_AUTH_ISSUER',
      'UIXO_AUTH_AUDIENCE',
    ])
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
  }
  return { db, registry, api, close, origin: options.origin };
}

test('HTTP vertical slice: real source metadata, curator publication, search, detail and authorised recipe', async () => {
  const f = await setup();
  try {
    await f.registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0],
      draft = await f.registry.stage(asset);
    assert.equal((await f.api('search')).data.total, 0);
    const queue = await f.api('queue', 'curator');
    assert.equal(queue.data.total, 1);
    assert.equal(
      (
        await f.api('review', 'curator', {
          id: draft.id,
          decision: 'approve',
          reason: 'Source and full licence evidence reviewed.',
        })
      ).status,
      200,
    );
    const search = await f.api('search&q=accordion&framework=react&commercial=true');
    assert.equal(search.data.total, 1);
    const detail = await f.api(`asset&id=${asset.id}`);
    assert.equal(detail.data.licence.expression, 'MIT');
    const recipe = await f.api('resolve', undefined, { id: asset.id });
    assert.equal(recipe.data.status, 'ready');
    assert.equal(recipe.data.executed, false);
    assert.equal(recipe.data.command.executable, 'npx');
    const compatibility = await f.api('compatibility', undefined, {
      id: asset.id,
      project: { framework: 'vue' },
    });
    assert.equal(compatibility.data.status, 'incompatible');
  } finally {
    await f.close();
  }
});
test('server enforces curator, scout and worker scopes instead of trusting the UI', async () => {
  const f = await setup();
  try {
    assert.equal((await f.api('queue')).status, 401);
    assert.equal((await f.api('queue', 'scout')).status, 401);
    assert.equal((await f.api('queue', 'worker')).status, 200);
    assert.equal((await f.api('scout', 'worker')).status, 200);
    assert.equal(
      (
        await f.api('review', 'worker', {
          id: 'anything',
          decision: 'approve',
          reason: 'Attempted privilege escalation.',
        })
      ).status,
      401,
    );
    assert.equal((await f.api('enqueue', 'scout', { providerId: 'shadcn' })).status, 401);
    assert.equal(
      (
        await f.api('scout', 'scout', {
          items: [{ url: 'https://example.com/', name: 'Discovery' }],
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.api('scout', 'worker', { items: [{ url: 'https://example.com/' }] })).status,
      401,
    );
    assert.equal((await f.api('status')).data.role, 'visitor');
    assert.equal((await f.api('status', 'curator')).data.role, 'curator');
  } finally {
    await f.close();
  }
});
test('origin, method, input and byte limits reject invalid requests', async () => {
  const f = await setup();
  try {
    assert.equal(
      (await f.api('search', undefined, undefined, { origin: 'https://untrusted.example' })).status,
      403,
    );
    assert.equal((await f.api('search', undefined, {})).status, 405);
    assert.equal((await f.api('search&limit=9999')).status, 400);
    assert.equal(
      (await f.api('review', 'curator', { id: 'test', decision: 'approve', reason: 'tiny' }))
        .status,
      400,
    );
    assert.equal((await f.api('resolve', undefined, { id: 'x'.repeat(201000) })).status, 413);
    assert.equal((await f.api('resolve', undefined, { id: '../admin' })).status, 400);
    assert.equal((await f.api('unknown')).status, 404);
    const response = await fetch(`${f.origin}/api/registry?action=resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{broken',
    });
    assert.equal(response.status, 400);
    await response.text();
  } finally {
    await f.close();
  }
});
test('snapshot deployment is explicitly read-only, including for valid curator credentials', async () => {
  const f = await setup(true);
  try {
    await seedCaptured(f.registry);
    const status = await f.api('status');
    assert.equal(status.data.readOnly, true);
    assert.equal(status.data.stats.assets, 168);
    const mutation = await f.api('scout', 'curator', { items: [{ url: 'https://example.com/' }] });
    assert.equal(mutation.status, 503);
    assert.equal(mutation.data.error.code, 'READ_ONLY_SNAPSHOT');
  } finally {
    await f.close();
  }
});
test('public HTTP rate limit is applied before identity verification', async () => {
  const f = await setup();
  try {
    let response;
    for (let i = 0; i < 181; i++) response = await f.api('status');
    assert.equal(response!.status, 429);
    assert.equal(response!.data.error.code, 'RATE_LIMITED');
  } finally {
    await f.close();
  }
});
