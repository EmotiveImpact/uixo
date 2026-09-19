import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

// Read-only acceptance against one explicitly selected origin. No database or service
// credentials, migration, publication, acquisition execution or remote code evaluation.
const input = process.argv[2];
if (!input) throw new Error('Usage: verify-release.ts <origin> [--require-persistent]');
const origin = new URL(input);
const loopback = ['127.0.0.1', 'localhost'].includes(origin.hostname);
if (
  (origin.protocol !== 'https:' && !(loopback && origin.protocol === 'http:')) ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
)
  throw new Error('Supply one HTTPS origin, or an isolated loopback HTTP origin.');
const endpoint = origin.origin;
const read = async (action: string) => {
  const response = await fetch(endpoint + '/api/registry?' + action, {
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, 'Public registry request failed: ' + action);
  assert.ok(response.headers.get('content-type')?.includes('application/json'));
  return response.json();
};
const status = await read('action=status');
assert.equal(status.release, 'discovery-v2');
assert.equal(status.intelligence?.ready, true, 'Intelligence schema has not been activated.');
if (process.argv.includes('--require-persistent')) {
  assert.equal(status.storage, 'postgres', 'Production requires the intended persistent registry.');
  assert.equal(status.readOnly, false);
}
const sources = await read('action=source-directory');
assert.ok(sources.items.length > 0, 'No approved providers are available.');
const collections = await read('action=collections&limit=12');
assert.ok(collections.total > 0, 'No reviewed collections have been published.');
const search = await read('action=search&q=card&framework=react&limit=12');
assert.ok(search.items.length > 0, 'The representative acquisition journey has no asset.');
for (const action of ['coverage', 'operations', 'collections-editor']) {
  const response = await fetch(endpoint + '/api/registry?action=' + action, {
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 401, 'Private data must not be exposed: ' + action);
}
const client = new Client(
  { name: 'uixo-release-acceptance', version: '1.0.0' },
  {
    versionNegotiation: { mode: 'auto' },
  },
);
const transport = new StreamableHTTPClientTransport(new URL(endpoint + '/api/mcp'), {
  fetch: (url, init) => {
    if (new URL(String(url)).origin !== endpoint) throw new Error('Unexpected MCP origin.');
    return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) });
  },
});
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 9);
  assert.ok(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true));
  const call = async (name: string, args: Record<string, unknown>) => {
    const response = await client.callTool({ name, arguments: args });
    assert.notEqual(response.isError, true, 'MCP operation failed: ' + name);
    assert.ok(response.structuredContent);
    return response.structuredContent!;
  };
  const results = await call('search_assets', { q: 'card', framework: 'react', limit: 12 });
  assert.deepEqual(
    (results.items as { id: string }[]).map((item) => item.id),
    search.items.map((item: { id: string }) => item.id),
  );
  const id = search.items[0].id;
  const detail = await read('action=asset&id=' + encodeURIComponent(id));
  const inspected = await call('inspect_asset', { id });
  assert.deepEqual(inspected.asset, detail);
  await call('get_preview', { id });
  const resolved = await call('resolve_asset', { id });
  const acquired = await call('acquire_asset', { id });
  assert.equal(acquired.executed, false);
  assert.equal(resolved.sourceRef, acquired.sourceRef);
  await call('check_compatibility', { id, project: { framework: 'react', packages: {} } });
  const source = await call('get_source_health', { provider: detail.providerId });
  const publicSource = await read(
    'action=source-health&provider=' + encodeURIComponent(detail.providerId),
  );
  assert.deepEqual(source.source, publicSource);
  const selections = await call('list_asset_collections', { limit: 12 });
  assert.deepEqual(selections.items, collections.items);
  const slug = collections.items[0].slug;
  const selection = await call('inspect_asset_collection', { slug });
  assert.deepEqual(
    selection.collection,
    await read('action=collection&slug=' + encodeURIComponent(slug)),
  );
  console.log(
    JSON.stringify(
      {
        origin: endpoint,
        release: status.release,
        build: status.build,
        storage: status.storage,
        schemaReady: status.intelligence.ready,
        publicCollections: collections.total,
        approvedSources: sources.total,
        tools: tools.tools.map((tool) => tool.name),
        webMcpParity: true,
        unauthorisedPrivateReadsBlocked: true,
        representativeAsset: id,
        acquisitionExecuted: false,
        scope: 'read-only-network-acceptance; not signed-in identity or installation acceptance',
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
