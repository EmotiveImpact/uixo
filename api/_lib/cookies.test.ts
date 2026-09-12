import { describe, expect, it } from 'vitest';
import { firstParty, requestIsHttps, requestOrigin, toUpstreamCookies } from './cookies';

describe('firstParty', () => {
  const upstream =
    '__Secure-neonauth.session_token=abc; Path=/neondb/auth; Domain=ep-x.neonauth.aws.neon.tech; Secure; HttpOnly; SameSite=None; Partitioned';

  it('drops Neon Domain, Partitioned and SameSite=None, and serves the cookie on /', () => {
    expect(firstParty(upstream, true)).toBe(
      '__Secure-neonauth.session_token=abc; HttpOnly; Path=/; SameSite=Lax; Secure',
    );
  });

  it('drops the __Secure- prefix over http so 127.0.0.1 will store the cookie', () => {
    expect(firstParty(upstream, false)).toBe(
      'neonauth.session_token=abc; HttpOnly; Path=/; SameSite=Lax',
    );
  });

  it('rewrites Neon Auth challenge cookies onto / so /api/auth can send them back', () => {
    const challenge =
      '__Secure-neon-auth.session_challenge=xyz; Path=/neondb/auth; Domain=ep-x.neonauth.aws.neon.tech; Secure; HttpOnly; SameSite=None; Partitioned';
    expect(firstParty(challenge, false)).toBe(
      'neon-auth.session_challenge=xyz; HttpOnly; Path=/; SameSite=Lax',
    );
  });
});

describe('toUpstreamCookies', () => {
  it('puts the __Secure- prefix back so Neon recognises the cookie', () => {
    expect(toUpstreamCookies('neonauth.session_token=abc; neon-auth.session_challenge=def')).toBe(
      '__Secure-neonauth.session_token=abc; __Secure-neon-auth.session_challenge=def',
    );
  });

  it('leaves an already-prefixed cookie alone', () => {
    expect(toUpstreamCookies('__Secure-neonauth.session_token=abc')).toBe(
      '__Secure-neonauth.session_token=abc',
    );
  });
});

describe('request origin', () => {
  it('uses x-forwarded-proto on Vercel', () => {
    const req = { headers: { host: 'uixo-brown.vercel.app', 'x-forwarded-proto': 'https' } };
    expect(requestIsHttps(req)).toBe(true);
    expect(requestOrigin(req)).toBe('https://uixo-brown.vercel.app');
  });

  it('is http on localhost', () => {
    const req = { headers: { host: '127.0.0.1:3000' } };
    expect(requestIsHttps(req)).toBe(false);
    expect(requestOrigin(req)).toBe('http://127.0.0.1:3000');
  });
});
