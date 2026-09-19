import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { toUpstreamCookies } from './cookies.js';
import { db } from './db.js';

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

/**
 * The session cookie belongs to the auth service's own domain, so a browser will never
 * send it to this API. Neon Auth issues a short-lived signed JWT for exactly this: the
 * client fetches one and presents it here, and we verify the signature against the keys
 * the service publishes. Nothing the caller says about itself is taken on trust.
 */
let keys: ReturnType<typeof createRemoteJWKSet> | null = null;
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jwks() {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;
  if (!keys) keys = createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));
  return keys;
}

async function verifiedBearerUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;

  const set = jwks();
  const base = process.env.NEON_AUTH_BASE_URL ?? '';
  const configuredIssuer = process.env.UIXO_AUTH_ISSUER;
  const configuredAudience = process.env.UIXO_AUTH_AUDIENCE;
  if (!set) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), set, {
      ...(configuredIssuer ? { issuer: configuredIssuer } : {}),
      ...(configuredAudience ? { audience: configuredAudience } : {}),
      requiredClaims: ['sub', 'exp', 'iat'],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== 'string' || !USER_ID.test(payload.sub)) return null;
    if (!configuredIssuer) {
      if (typeof payload.iss !== 'string') return null;
      const authOrigin = new URL(base).origin;
      const tokenIssuer = new URL(payload.iss);
      if (tokenIssuer.protocol !== 'https:' || tokenIssuer.origin !== authOrigin) return null;
    }
    return payload.sub;
  } catch {
    // Bad signature, expired, wrong key — all mean the same thing here.
    return null;
  }
}

/**
 * Validate the first-party session cookie against Neon Auth itself.
 *
 * Some Neon Auth configurations expose the account through get-session but do not return a
 * browser JWT from /token. The proxy already rewrites Neon's cookie names for this origin; put
 * those names back and ask the configured auth service to verify the session. The API never
 * decodes or trusts cookie contents locally.
 */
export async function verifiedCookieUserId(req: VercelRequest): Promise<string | null> {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  const rawCookie = req.headers.cookie;
  const cookie = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie;
  if (!base || !cookie) return null;
  const authCookies = cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => /^(?:__Secure-)?(?:neon-auth\.|neonauth\.)[^=]*=/i.test(part))
    .join('; ');
  if (!authCookies) return null;

  try {
    const response = await fetch(`${base}/get-session`, {
      method: 'GET',
      headers: { cookie: toUpstreamCookies(authCookies) },
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: { id?: unknown } | null };
    const id = data.user?.id;
    return typeof id === 'string' && USER_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** The verified subject of the request, or null. */
export async function verifiedUserId(req: VercelRequest): Promise<string | null> {
  return (await verifiedBearerUserId(req)) ?? verifiedCookieUserId(req);
}

/**
 * Whether the verified user is allowed to curate.
 *
 * The role is read from the database rather than from the token, because a claim inside a
 * token is only as current as the token: promoting or demoting someone would otherwise
 * take effect whenever their JWT happened to expire.
 */
export async function isCuratorUser(userId: string): Promise<boolean> {
  const sql = db();
  const rows = await sql`select role from neon_auth."user" where id = ${userId}::uuid limit 1`;
  const role = rows[0]?.role;
  return role === 'admin' || role === 'curator';
}

/** The signed-in member, or a 401. Used for private data such as lists. */
export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const userId = await verifiedUserId(req);
  if (userId) return userId;
  json(res, 401, { error: 'You need to sign in to do that.' });
  return null;
}

export async function requireCurator(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (hasCuratorToken(req)) return true;

  const userId = await verifiedUserId(req);
  if (userId && (await isCuratorUser(userId))) return true;

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
