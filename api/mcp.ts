import type { ServerResponse } from 'node:http';
import type { RequestLike } from '../registry/http.ts';
import { json } from '../registry/http.ts';
import { getRegistry } from '../registry/runtime.ts';

export const config = { maxDuration: 60 };

function requestOrigin(req: RequestLike): string {
  if (process.env.UIXO_ORIGIN) return process.env.UIXO_ORIGIN;
  const forwarded = req.headers['x-forwarded-host'];
  const host = String(
    Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers.host || '',
  );
  if (/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) {
    const forwardedProtocol = req.headers['x-forwarded-proto'];
    const protocol = forwardedProtocol === 'http' ? 'http' : 'https';
    return `${protocol}://${host}`;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:4175';
}

export default async function handler(req: RequestLike, res: ServerResponse) {
  try {
    const { handleMcp } = await import('../registry/mcp-http.ts');
    await handleMcp(await getRegistry(), req, res, requestOrigin(req));
  } catch {
    if (!res.headersSent)
      json(res, 503, {
        error: {
          code: 'MCP_UNAVAILABLE',
          message: 'MCP dependencies or the registry could not be initialised.',
        },
      });
  }
}
