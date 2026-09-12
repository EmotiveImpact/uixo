import test from 'node:test';
import assert from 'node:assert/strict';
import { registryCall } from './client.ts';
const token = 'test-worker-only-'.repeat(3);
test('Eve tools cannot choose arbitrary origins, methods or publication actions', async () => {
  await assert.rejects(
    registryCall('review' as never, {}, { origin: 'https://example.com', token }),
    /Unsupported/,
  );
  await assert.rejects(
    registryCall('scout', {}, { origin: 'https://example.com', token }),
    /Method/,
  );
  await assert.rejects(
    registryCall('jobs', undefined, { origin: 'http://localhost', token }),
    /HTTPS/,
  );
  await assert.rejects(
    registryCall('jobs', undefined, { origin: 'https://example.com/other', token }),
    /HTTPS/,
  );
});
test('Eve bridge uses a fixed endpoint, caps evidence and does not reflect server errors', async () => {
  const result = await registryCall('queue', undefined, {
    origin: 'https://example.com',
    token,
    fetchImpl: async (url, init) => {
      assert.match(String(url), /\/api\/registry\?action=queue&limit=12$/);
      assert.equal(init?.redirect, 'manual');
      return new Response(
        JSON.stringify({
          items: Array.from({ length: 20 }, () => ({
            asset: { licence: { text: 'large secret content', expression: 'MIT' } },
          })),
        }),
      );
    },
  });
  assert.equal((result.items as unknown[]).length, 12);
  assert.ok(!JSON.stringify(result).includes('large secret content'));
  await assert.rejects(
    registryCall('jobs', undefined, {
      origin: 'https://example.com',
      token,
      fetchImpl: async () => new Response('secret', { status: 403 }),
    }),
    (error: Error) => !error.message.includes('secret'),
  );
});
