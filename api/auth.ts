import type { VercelRequest, VercelResponse } from '@vercel/node';
import { incomingToRequest, proxyNeonAuth, sendAuthResponse } from './_lib/auth-proxy.js';
import { requestIsHttps } from './_lib/cookies.js';

/**
 * Proxies Neon Auth through UIXO's own origin via the official Neon handler.
 *
 * Neon Auth sets its session cookie on its own domain, which makes it a third-party
 * cookie. Safari blocks those outright and Firefox and Chrome are closing the same door,
 * so sign-in appeared to succeed and then the session could never be read back.
 *
 * Forwarding through here makes the cookie first-party. The official handler also
 * marks the request as a Neon Auth proxy so Google's challenge cookie is issued on
 * the social POST instead of only on neon.tech.
 */

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const tail = (Array.isArray(raw) ? raw.join('/') : (raw ?? '')).replace(/^\/+/, '');
  const request = await incomingToRequest(req);
  await sendAuthResponse(res, await proxyNeonAuth(request, tail, requestIsHttps(req)));
}
