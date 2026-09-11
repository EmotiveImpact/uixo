import type { VercelRequest, VercelResponse } from '@vercel/node';

export function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader('content-type', 'application/json');
  res.send(JSON.stringify(body));
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('allow', allowed.join(', '));
  json(res, 405, { error: `Method not allowed. Try ${allowed.join(' or ')}.` });
}

/**
 * Break-glass access by shared secret, for scripts and for the case where the auth service
 * is unreachable. Compared character by character so the time taken never leaks how much
 * of the token was right.
 */
export function hasCuratorToken(req: VercelRequest): boolean {
  const expected = process.env.CURATOR_TOKEN;
  if (!expected) return false;

  const header = req.headers.authorization ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (supplied.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

type AuthUser = { id: string; email: string; role?: string };

/**
 * Ask Neon Auth who this request belongs to.
 *
 * The session is a cookie on the auth service's own origin, so the cookie header is
 * forwarded verbatim and the answer comes from the service rather than from anything the
 * caller asserted. A request carrying a forged cookie gets no session back.
 */
export async function sessionUser(req: VercelRequest): Promise<AuthUser | null> {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  const cookie = req.headers.cookie;
  if (!base || !cookie) return null;

  try {
    const response = await fetch(`${base}/get-session`, { headers: { cookie } });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: AuthUser; session?: unknown } | null;
    return data?.user && data.session ? data.user : null;
  } catch {
    return null;
  }
}

/** A curator is an admin in Neon Auth, or a caller holding the break-glass token. */
export async function requireCurator(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (hasCuratorToken(req)) return true;

  const user = await sessionUser(req);
  if (user && (user.role === 'admin' || user.role === 'curator')) return true;

  json(res, 401, { error: 'You need a curator account to do that.' });
  return false;
}

/** Trim, cap and reject empty strings in one place so every field is handled alike. */
export function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export function httpUrl(value: unknown): string | null {
  const raw = text(value, 2048);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    // Anything other than http(s) is either a mistake or an attempt at something else.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
