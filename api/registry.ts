import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRegistry } from '../registry/runtime.ts';
import { createRegistryHandler, json } from '../registry/http.ts';
export const config = { maxDuration: 300 };

function requestOrigin(req: IncomingMessage): string {
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await createRegistryHandler(await getRegistry(), { origin: requestOrigin(req) })(req, res);
  } catch {
    json(res, 503, {
      error: {
        code: 'REGISTRY_UNAVAILABLE',
        message: 'Registry startup failed. Check configuration and migrations.',
      },
    });
  }
}
