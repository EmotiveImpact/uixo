import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasCuratorToken, httpUrl, text, verifiedCookieUserId } from './http';
import type { VercelRequest } from '@vercel/node';

const req = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as VercelRequest;

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEON_AUTH_BASE_URL;
});

describe('text', () => {
  it('trims and accepts', () => {
    expect(text('  hello  ', 10)).toBe('hello');
  });

  it('rejects empty, whitespace-only, over-long and non-strings', () => {
    expect(text('', 10)).toBeNull();
    expect(text('   ', 10)).toBeNull();
    expect(text('abcdefghijk', 10)).toBeNull();
    expect(text(undefined, 10)).toBeNull();
    expect(text(42, 10)).toBeNull();
    expect(text({ toString: () => 'x' }, 10)).toBeNull();
  });
});

describe('httpUrl', () => {
  it('accepts http and https', () => {
    expect(httpUrl('https://a.dev/x')).toBe('https://a.dev/x');
    expect(httpUrl('http://a.dev')).toBe('http://a.dev/');
  });

  it('rejects other schemes, which is the point of checking at all', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'file:///etc/passwd',
      'ftp://a.dev',
    ]) {
      expect(httpUrl(bad)).toBeNull();
    }
  });

  it('rejects nonsense that is not a URL', () => {
    expect(httpUrl('not a url')).toBeNull();
    expect(httpUrl('')).toBeNull();
  });
});

describe('hasCuratorToken (break-glass)', () => {
  it('refuses everything when no token is configured', () => {
    delete process.env.CURATOR_TOKEN;
    expect(hasCuratorToken(req('Bearer anything'))).toBe(false);
    expect(hasCuratorToken(req())).toBe(false);
  });

  it('accepts only the exact token', () => {
    process.env.CURATOR_TOKEN = 'correct-horse-battery-staple';
    expect(hasCuratorToken(req('Bearer correct-horse-battery-staple'))).toBe(true);
    expect(hasCuratorToken(req('Bearer correct-horse-battery-stapl'))).toBe(false);
    expect(hasCuratorToken(req('Bearer CORRECT-horse-battery-staple'))).toBe(false);
    expect(hasCuratorToken(req('correct-horse-battery-staple'))).toBe(false);
    expect(hasCuratorToken(req())).toBe(false);
    delete process.env.CURATOR_TOKEN;
  });

  it('does not accept a prefix of the token', () => {
    process.env.CURATOR_TOKEN = 'abcdef';
    expect(hasCuratorToken(req('Bearer abc'))).toBe(false);
    expect(hasCuratorToken(req('Bearer abcdefgh'))).toBe(false);
    delete process.env.CURATOR_TOKEN;
  });
});

describe('verifiedCookieUserId', () => {
  it('asks the configured Neon Auth service to verify the first-party session cookie', async () => {
    process.env.NEON_AUTH_BASE_URL = 'https://example.neonauth.test/neondb/auth';
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual({
        cookie: '__Secure-neon-auth.session_token=signed-session',
      });
      return new Response(
        JSON.stringify({ user: { id: 'be7bd668-ffdb-40d3-b89e-44bc7b03c629' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const request = {
      headers: {
        cookie:
          'theme=dark; neon-auth.session_token=signed-session; unrelated-secret=do-not-forward',
      },
    } as VercelRequest;

    expect(await verifiedCookieUserId(request)).toBe('be7bd668-ffdb-40d3-b89e-44bc7b03c629');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://example.neonauth.test/neondb/auth/get-session',
    );
  });

  it('rejects an unverified, failed or malformed session', async () => {
    process.env.NEON_AUTH_BASE_URL = 'https://example.neonauth.test/neondb/auth';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user: { id: 'not-a-user-id' } }, { status: 200 })),
    );
    expect(
      await verifiedCookieUserId({
        headers: { cookie: 'neon-auth.session_token=x' },
      } as VercelRequest),
    ).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({}, { status: 401 })),
    );
    expect(
      await verifiedCookieUserId({
        headers: { cookie: 'neon-auth.session_token=x' },
      } as VercelRequest),
    ).toBeNull();
  });
});
