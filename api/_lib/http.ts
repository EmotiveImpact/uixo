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
 * Curator endpoints are gated by a single shared secret held only on the server.
 *
 * This is deliberately modest: one operator, one secret, checked in constant time. It is
 * not a user system and should not grow into one — when several people need accounts,
 * replace it wholesale rather than bolting roles onto a password. What it does do is
 * actually gate, which the mock provider it replaces did not.
 */
export function isCurator(req: VercelRequest): boolean {
  const expected = process.env.CURATOR_TOKEN;
  if (!expected) return false;

  const header = req.headers.authorization ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (supplied.length !== expected.length) return false;

  // Compare every character so the time taken does not leak the prefix length.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function requireCurator(req: VercelRequest, res: VercelResponse): boolean {
  if (isCurator(req)) return true;
  json(res, 401, { error: 'Curator token required.' });
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
