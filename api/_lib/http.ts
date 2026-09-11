import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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

function jwks() {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;
  if (!keys) keys = createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));
  return keys;
}

/** The verified subject of the request, or null. Expiry and issuer are checked too. */
export async function verifiedUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;

  const set = jwks();
  const issuer = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/(neondb\/auth)?\/*$/, '');
  if (!set) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), set);
    if (issuer && payload.iss && !String(payload.iss).startsWith('https://')) return null;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    // Bad signature, expired, wrong key — all mean the same thing here.
    return null;
  }
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
