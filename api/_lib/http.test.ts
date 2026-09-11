import { describe, expect, it } from 'vitest';
import { httpUrl, isCurator, text } from './http';
import type { VercelRequest } from '@vercel/node';

const req = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as VercelRequest;

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

describe('isCurator', () => {
  it('refuses everything when no token is configured', () => {
    delete process.env.CURATOR_TOKEN;
    expect(isCurator(req('Bearer anything'))).toBe(false);
    expect(isCurator(req())).toBe(false);
  });

  it('accepts only the exact token', () => {
    process.env.CURATOR_TOKEN = 'correct-horse-battery-staple';
    expect(isCurator(req('Bearer correct-horse-battery-staple'))).toBe(true);
    expect(isCurator(req('Bearer correct-horse-battery-stapl'))).toBe(false);
    expect(isCurator(req('Bearer CORRECT-horse-battery-staple'))).toBe(false);
    expect(isCurator(req('correct-horse-battery-staple'))).toBe(false);
    expect(isCurator(req())).toBe(false);
    delete process.env.CURATOR_TOKEN;
  });

  it('does not accept a prefix of the token', () => {
    process.env.CURATOR_TOKEN = 'abcdef';
    expect(isCurator(req('Bearer abc'))).toBe(false);
    expect(isCurator(req('Bearer abcdefgh'))).toBe(false);
    delete process.env.CURATOR_TOKEN;
  });
});
