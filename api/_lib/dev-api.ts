import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Enough of the Vercel req/res shape for local Vite to call the same handlers
 * production uses. Auth stays on the existing /api/auth proxy.
 */
export async function runVercelHandler(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (req: VercelRequest, res: VercelResponse) => unknown,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  let body: unknown = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  const vercelReq = {
    method: req.method,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
    body,
  } as VercelRequest;

  let status = 200;
  const vercelRes = {
    status(code: number) {
      status = code;
      return vercelRes;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      res.setHeader(name, value);
      return vercelRes;
    },
    send(payload: unknown) {
      res.statusCode = status;
      if (payload === undefined || payload === null) {
        res.end();
        return vercelRes;
      }
      res.end(typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : String(payload));
      return vercelRes;
    },
  } as unknown as VercelResponse;

  await handler(vercelReq, vercelRes);
}
