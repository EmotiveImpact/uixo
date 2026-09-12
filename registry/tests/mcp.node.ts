import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createRegistryMcp } from '../mcp.ts';
import { sqliteDatabase, migrate } from '../database.ts';
import { Registry } from '../service.ts';
import { seedCaptured } from '../bootstrap.ts';

test('real MCP client discovers and calls every UIXO tool through the official HTTP handler', async () => {
  const db = await sqliteDatabase(':memory:');
  await migrate(db);
  const registry = new Registry(db);
  await seedCaptured(registry);
  const handler = createMcpHandler(() => createRegistryMcp(registry), { responseMode: 'json' });
  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: 'uixo-integration-test', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );
  try {
    await client.connect(transport);
    const discovered = await client.listTools();
    assert.equal(discovered.tools.length, 6);
    const search = await client.callTool({
      name: 'search_assets',
      arguments: { q: 'sidebar', framework: 'react', commercial: true },
    });
    assert.notEqual(search.isError, true);
    assert.ok(search.structuredContent);
    const items = search.structuredContent?.items as { id: string }[];
    assert.equal(items.length, 1);
    const id = items[0].id;
    for (const name of ['inspect_asset', 'get_preview', 'resolve_asset', 'acquire_asset']) {
      const result = await client.callTool({ name, arguments: { id } });
      assert.notEqual(result.isError, true);
      assert.ok(result.structuredContent);
    }
    const compatibility = await client.callTool({
      name: 'check_compatibility',
      arguments: { id, project: { framework: 'vue', packages: {} } },
    });
    assert.equal(compatibility.structuredContent?.status, 'incompatible');
    const invalid = await client.callTool({ name: 'search_assets', arguments: { limit: 99999 } });
    assert.equal(invalid.isError, true);
    const missing = await client.callTool({
      name: 'inspect_asset',
      arguments: { id: 'missing/asset' },
    });
    assert.equal(missing.isError, true);
    const resources = await client.listResources();
    assert.ok(resources.resources.some((r) => r.uri === 'uixo://registry/policy'));
    const policy = await client.readResource({ uri: 'uixo://registry/policy' });
    assert.ok(policy.contents.length);
  } finally {
    await client.close();
    await handler.close();
    await db.close();
  }
});
