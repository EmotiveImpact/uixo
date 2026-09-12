import type { ServerResponse } from 'node:http';
import type { RequestLike } from '../registry/http.ts';
import { json } from '../registry/http.ts';
import { getRegistry } from '../registry/runtime.ts';

export const config = { maxDuration: 60 };
export default async function handler(req: RequestLike, res: ServerResponse) {
  try {
    const { handleMcp } = await import('../registry/mcp-http.ts');
    const origin = process.env.UIXO_ORIGIN || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:4175');
    await handleMcp(await getRegistry(), req, res, origin);
  } catch { if (!res.headersSent) json(res, 503, { error: { code: 'MCP_UNAVAILABLE', message: 'MCP dependencies or the registry could not be initialised.' } }); }
}
