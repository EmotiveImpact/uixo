/**
 * Neon Auth issues cookies for its own host: Domain=*.neonauth…, Path=/neondb/auth,
 * SameSite=None, Partitioned. Once we proxy through this site those attributes are wrong —
 * the browser will refuse a Domain it does not own, and a Path under /neondb/auth is
 * never sent to /api/auth. Strip the cross-site bits and make the cookie host-only on /.
 */
export function firstParty(cookie: string, secure: boolean): string {
  const parts = cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  let nameValue = parts.shift();
  if (!nameValue) return cookie;

  // `__Secure-` cookies are rejected on http://127.0.0.1 (only the name "localhost"
  // is treated as a secure origin for that prefix). Drop the prefix on http so the
  // challenge cookie survives Google and can be sent back on get-session.
  if (!secure) nameValue = nameValue.replace(/^__(secure|host)-/i, '');

  const kept: string[] = [nameValue];
  for (const part of parts) {
    if (/^partitioned$/i.test(part)) continue;
    if (/^samesite=/i.test(part)) continue;
    if (/^domain=/i.test(part)) continue;
    if (/^path=/i.test(part)) continue;
    if (/^secure$/i.test(part)) continue;
    kept.push(part);
  }
  kept.push('Path=/', 'SameSite=Lax');
  if (secure || /^__(secure|host)-/i.test(nameValue)) kept.push('Secure');
  return kept.join('; ');
}

/**
 * Neon still expects the `__Secure-` names it issued. Put the prefix back on the
 * Cookie header we forward upstream after we stripped it for the browser.
 */
export function toUpstreamCookies(header: string): string {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq < 0) return part;
      const name = part.slice(0, eq);
      const value = part.slice(eq + 1);
      if (/^__secure-/i.test(name)) return part;
      if (/^(neon-auth\.|neonauth\.)/i.test(name)) return `__Secure-${name}=${value}`;
      return part;
    })
    .join('; ');
}

export function requestIsHttps(req: { headers: Record<string, unknown> }): boolean {
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim();
  if (forwarded) return forwarded === 'https';
  const host = String(req.headers.host ?? '');
  return !host.startsWith('localhost') && !host.startsWith('127.0.0.1');
}

export function requestOrigin(req: { headers: Record<string, unknown> }): string {
  const host = String(req.headers.host ?? '');
  const proto = requestIsHttps(req) ? 'https' : 'http';
  return `${proto}://${host}`;
}
