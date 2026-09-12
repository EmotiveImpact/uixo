import type { IncomingMessage } from 'node:http';
import { tokenMatches } from './policy.ts';
export type Principal = { id: string; role: 'curator' | 'scout' | 'worker' } | null;
export async function principal(req: IncomingMessage): Promise<Principal> {
  const raw = req.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice(7);
  if (tokenMatches(token, process.env.UIXO_CURATOR_TOKEN))
    return { id: 'curator-service', role: 'curator' };
  if (tokenMatches(token, process.env.UIXO_SCOUT_TOKEN))
    return { id: 'grok-x-scout', role: 'scout' };
  if (tokenMatches(token, process.env.UIXO_WORKER_TOKEN))
    return { id: 'index-worker', role: 'worker' };
  const issuer = process.env.UIXO_AUTH_ISSUER,
    audience = process.env.UIXO_AUTH_AUDIENCE,
    base = process.env.NEON_AUTH_BASE_URL;
  if (!base || !process.env.DATABASE_URL) return null;
  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const authUrl = new URL(base);
    const jwksUrl = new URL(`${base.replace(/\/+$/, '')}/.well-known/jwks.json`);
    if (jwksUrl.protocol !== 'https:') return null;
    const { payload } = await jwtVerify(token, createRemoteJWKSet(jwksUrl), {
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
      requiredClaims: ['sub', 'exp', 'iat'],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.sub)) return null;
    // Neon integrations do not currently provide claim settings as Vercel variables.
    // The exact project JWKS proves the signature; additionally constrain an unconfigured
    // issuer to the same Neon Auth origin. Explicit issuer/audience values remain stricter.
    if (!issuer) {
      if (typeof payload.iss !== 'string') return null;
      const tokenIssuer = new URL(payload.iss);
      if (tokenIssuer.protocol !== 'https:' || tokenIssuer.origin !== authUrl.origin) return null;
    }
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT role FROM neon_auth."user" WHERE id=${payload.sub}::uuid LIMIT 1`;
    return ['admin', 'curator'].includes(String(rows[0]?.role))
      ? { id: payload.sub, role: 'curator' }
      : null;
  } catch {
    return null;
  }
}
