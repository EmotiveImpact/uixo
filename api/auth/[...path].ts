import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxies Neon Auth through UIXO's own origin.
 *
 * Neon Auth sets its session cookie on its own domain, which makes it a third-party
 * cookie. Safari blocks those outright and Firefox and Chrome are closing the same door,
 * so sign-in appeared to succeed and then the session could never be read back — the POST
 * worked, the cookie was stored, and nothing was ever allowed to send it again.
 *
 * Forwarding through here makes the cookie first-party: same site, no blocking, and it
 * keeps working when third-party cookies disappear entirely.
 */

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

export const config = { api: { bodyParser: false } };

async function rawBody(req: VercelRequest): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return new Uint8Array(chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0));
}

/**
 * The upstream cookie is built for a cross-site world. Once it is first-party those
 * attributes are wrong: Partitioned would key it to the embedding site, and SameSite=None
 * needlessly permits it on other people's pages.
 */
function firstParty(cookie: string): string {
  return cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => !/^partitioned$/i.test(part) && !/^samesite=/i.test(part))
    .concat('SameSite=Lax')
    .join('; ');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) return res.status(503).json({ error: 'Auth is not configured.' });

  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? ''];
  const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${base}/${segments.join('/')}${query}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase()) || value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  // The upstream checks Origin against its trusted list; give it one it trusts.
  const self = `https://${req.headers.host}`;
  headers.set('origin', self);

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    // Node's fetch accepts a byte array; the DOM lib's BodyInit type does not admit it.
    body: (await rawBody(req)) as BodyInit | undefined,
    redirect: 'manual',
  });

  const cookies = upstream.headers.getSetCookie?.() ?? [];
  if (cookies.length) res.setHeader('set-cookie', cookies.map(firstParty));

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || lower === 'content-encoding' || lower === 'content-length')
      return;
    // Same-origin now, so the upstream's CORS headers are noise at best.
    if (lower.startsWith('access-control-')) return;
    res.setHeader(key, value);
  });

  res.status(upstream.status);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.send(buffer);
}
