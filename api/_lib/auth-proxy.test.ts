import { describe, expect, it } from 'vitest';
import { authPathFromUrl } from './auth-proxy';

describe('authPathFromUrl', () => {
  it('strips the /api/auth mount', () => {
    expect(authPathFromUrl('/api/auth/sign-in/social')).toBe('sign-in/social');
    expect(authPathFromUrl('/api/auth/get-session')).toBe('get-session');
  });
});
