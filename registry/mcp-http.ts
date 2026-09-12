import { createMcpHandler } from '@modelcontextprotocol/server';
import type { ServerResponse } from 'node:http';
import { createRegistryMcp } from './mcp.ts';
import type { Registry } from './service.ts';
import { RegistryError } from './domain.ts';
import { tokenMatches } from './policy.ts';
import { checkOrigin, json, rateLimit, readJson, type RequestLike } from './http.ts';

export async function handleMcp(registry: Registry, req: RequestLike, res: ServerResponse, origin: string) {
  let handler: ReturnType<typeof createMcpHandler> | undefined;
  try {
    const hosts = new Set([new URL(origin).host, process.env.VERCEL_URL].filter(Boolean));
    if (!req.headers.host || !hosts.has(req.headers.host)) throw new RegistryError('HOST_BLOCKED', 'Host is not allowed.', 403);
    checkOrigin(req, origin);
    if (process.env.UIXO_MCP_REQUIRE_TOKEN === 'true') {
      const supplied = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
      if (!tokenMatches(supplied, process.env.UIXO_MCP_TOKEN)) { res.setHeader('www-authenticate', 'Bearer realm="uixo"'); throw new RegistryError('UNAUTHORISED', 'A valid UIXO MCP service token is required.', 401); }
    }
    const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] ?? 'unknown').split(',')[0].trim() : req.socket.remoteAddress ?? 'local';
    await rateLimit(registry, `mcp:${ip}`, 120);
    let body: string | undefined;
    if (req.method === 'POST') body = JSON.stringify(await readJson(req, 100000));
    const headers = new Headers();
    // Only protocol headers cross the adapter. Credentials are checked above, not logged.
    for (const name of ['content-type', 'accept', 'mcp-protocol-version', 'mcp-session-id', 'last-event-id']) {
      const value = req.headers[name]; if (typeof value === 'string') headers.set(name, value);
    }
    handler = createMcpHandler(() => createRegistryMcp(registry), { responseMode: 'json' });
    const response = await handler.fetch(new Request(`${origin}/api/mcp`, { method: req.method ?? 'POST', headers, body }));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { res.setHeader(key, value); });
    res.setHeader('cache-control', 'no-store'); res.setHeader('x-content-type-options', 'nosniff');
    // UIXO tools return terminal JSON and do not advertise subscription streams.
    if (response.body) res.end(Buffer.from(await response.arrayBuffer())); else res.end();
  } catch (error) {
    if (!res.headersSent) json(res, error instanceof RegistryError ? error.status : 503, { error: { code: error instanceof RegistryError ? error.code : 'MCP_UNAVAILABLE', message: error instanceof RegistryError ? error.message : 'MCP is unavailable. Check its installed dependencies and registry configuration.' } });
    else res.end();
  } finally { await handler?.close(); }
}
