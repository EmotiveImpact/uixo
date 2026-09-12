import type { IncomingMessage } from 'node:http';
import { handleAuthProxyRequest } from '@neondatabase/auth/server';
import { firstParty, toUpstreamCookies } from './cookies.js';

const DEV_COOKIE_SECRET = 'local-dev-neon-auth-cookie-secret-min-32';

function cookieSecret(): string {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (secret && secret.length >= 32) return secret;
  return DEV_COOKIE_SECRET;
}

export function authPathFromUrl(pathname: string): string {
  return pathname.replace(/^\/api\/auth\/?/, '');
}

export async function incomingToRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost:3000';
  const proto = String(req.headers['x-forwarded-proto'] ?? 'http')
    .split(',')[0]
    .trim();
  const url = new URL(req.url ?? '/', `${proto}://${host}`);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method ?? 'GET',
    headers,
  };
  if (body && body.length && req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = new Uint8Array(body);
    init.duplex = 'half';
  }
  return new Request(url, init);
}

/**
 * Official Neon Auth proxy, then our first-party cookie rewrite.
 *
 * Neon’s handler sends `x-neon-auth-middleware` so the challenge cookie is
 * issued on the social POST (Google needs that). It still leaves Path=/neondb/auth
 * and `__Secure-` names, which this origin has to fix before the browser will
 * store or send them.
 */
export async function proxyNeonAuth(
  request: Request,
  path: string,
  secure: boolean,
): Promise<Response> {
  const base = (process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) return Response.json({ error: 'Auth is not configured.' }, { status: 503 });
  if (!path) return Response.json({ error: 'No auth route given.' }, { status: 404 });

  const headers = new Headers(request.headers);
  const cookie = headers.get('cookie');
  if (cookie) headers.set('cookie', toUpstreamCookies(cookie));

  const url = new URL(request.url);
  url.searchParams.delete('path');

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength) {
      init.body = body;
      init.duplex = 'half';
    }
  }

  const upstream = await handleAuthProxyRequest({
    request: new Request(url, init),
    path,
    baseUrl: base,
    cookieSecret: cookieSecret(),
    sameSite: 'lax',
  });

  const headersOut = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    if (key.toLowerCase().startsWith('access-control-')) return;
    headersOut.set(key, value);
  });

  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: headersOut,
  });
  for (const cookieHeader of upstream.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', firstParty(cookieHeader, secure));
  }
  return response;
}

export async function sendAuthResponse(
  res: {
    statusCode: number;
    setHeader(name: string, value: string | number | readonly string[]): void;
    end(chunk?: unknown): void;
  },
  response: Response,
): Promise<void> {
  res.statusCode = response.status;
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || lower === 'content-encoding' || lower === 'content-length')
      return;
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
