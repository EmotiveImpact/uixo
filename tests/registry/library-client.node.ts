import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ASSET_QUERY, assetHref, readAssetQuery, safeAssetUrl, parseSavedAssets, catalogueResult, registryRequest } from '../../src/lib/asset-library.ts';

test('asset URLs preserve filters, source, saved view, page and detail identity', () => {
  const query = { ...EMPTY_ASSET_QUERY, q: 'outline icon', provider: 'lucide', kind: 'icon', framework: 'react', format: 'tsx', commercial: true, price: 'free', offset: 24, view: 'saved' as const, id: 'lucide/activity' };
  const href = assetHref(query);
  assert.ok(href.startsWith('/browse/assets?'));
  assert.deepEqual(readAssetQuery(new URL(href, 'https://example.com').search), query);
});
test('default asset URL does not conflict with Vite static /assets directory', () => assert.equal(assetHref(EMPTY_ASSET_QUERY), '/browse/assets'));
test('invalid filters and offsets cannot silently empty the catalogue', () => {
  const query = readAssetQuery('?kind=madeup&framework=php&format=exe&price=surprise&offset=-5&provider=../../secret');
  assert.equal(query.kind, ''); assert.equal(query.framework, ''); assert.equal(query.format, ''); assert.equal(query.price, ''); assert.equal(query.offset, 0); assert.equal(query.provider, '');
});
test('invalid detail identities are discarded', () => assert.equal(readAssetQuery('?id=../secrets').id, ''));
test('search input is bounded', () => assert.equal(readAssetQuery('?q=' + 'a'.repeat(400)).q.length, 300));
test('unsafe links are never offered as asset acquisition links', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://user:password@example.com', null]) assert.equal(safeAssetUrl(value), undefined);
  assert.equal(safeAssetUrl('https://example.com/component'), 'https://example.com/component');
});
test('saved assets migrate from the existing browser key format without duplication', () => assert.deepEqual(parseSavedAssets('["lucide/activity","lucide/activity",null,"../bad"]'), ['lucide/activity']));
test('saved assets tolerate invalid browser storage', () => { assert.deepEqual(parseSavedAssets('broken'), []); assert.deepEqual(parseSavedAssets('{"unexpected":true}'), []); });
test('saved assets retain the backend 200-item limit', () => assert.equal(parseSavedAssets(JSON.stringify(Array.from({ length: 240 }, (_, i) => `test/asset-${i}`))).length, 200));
test('a valid empty result remains distinguishable from service errors', () => assert.deepEqual(catalogueResult({ items: [], total: 0, nextOffset: null }), { items: [], total: 0, nextOffset: null }));
test('malformed catalogue responses do not become zero results', () => {
  for (const value of [null, {}, { error: 'unavailable' }, { items: [], total: -1, nextOffset: null }, { items: 'oops', total: 0, nextOffset: null }]) assert.throws(() => catalogueResult(value));
});
test('HTML fallback from the API is reported as a routing/runtime error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>UIXO</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
  await assert.rejects(registryRequest('search'), /without JSON/);
});
test('registry 503 retains the server explanation', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Registry startup failed. Check configuration and migrations.' } }, { status: 503 }));
  await assert.rejects(registryRequest('search'), /startup failed/);
});
test('JSON null is not treated as catalogue data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(null));
  await assert.rejects(registryRequest('search'), /invalid response/);
});
test('abort signals reach fetch and errors are not swallowed', async (t) => {
  const controller = new AbortController(); controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => { assert.equal(init.signal, controller.signal); throw new DOMException('Aborted', 'AbortError'); });
  await assert.rejects(registryRequest('search', { signal: controller.signal }), { name: 'AbortError' });
});
test('acquisition instructions use JSON POST; they do not execute anything', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/registry?action=resolve'); assert.equal(init.method, 'POST'); assert.equal(init.body, '{"id":"test/asset"}');
    return Response.json({ status: 'ready', executed: false });
  });
  assert.deepEqual(await registryRequest('resolve', { body: { id: 'test/asset' } }), { status: 'ready', executed: false });
});
