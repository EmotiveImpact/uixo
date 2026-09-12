import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRegistry } from '../registry/runtime.ts';
import { createRegistryHandler, json } from '../registry/http.ts';
export const config = { maxDuration: 300 };
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const origin =
      process.env.UIXO_ORIGIN ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:4175');
    await createRegistryHandler(await getRegistry(), { origin })(req, res);
  } catch {
    json(res, 503, {
      error: {
        code: 'REGISTRY_UNAVAILABLE',
        message: 'Registry startup failed. Check configuration and migrations.',
      },
    });
  }
}
