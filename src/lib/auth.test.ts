import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth, sessionFrom } from './auth';

describe('sessionFrom', () => {
  it('accepts a user without a session object', () => {
    const session = sessionFrom({
      user: { id: '1', email: 'red@uixo.io', name: 'Red' },
    });
    expect(session?.user.email).toBe('red@uixo.io');
  });

  it('is signed out when there is no user', () => {
    expect(sessionFrom({ session: {} })).toBeNull();
    expect(sessionFrom(null)).toBeNull();
  });
});

describe('getSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/browse?neon_auth_session_verifier=abc');
  });

  afterEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    );
    await auth.signOut();
    window.history.replaceState(null, '', '/');
  });

  it('shares one in-flight read so Strict Mode cannot burn the verifier twice', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new Response(
          JSON.stringify({
            user: { id: '1', email: 'red@uixo.io', name: 'Red' },
            session: { id: 's1' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );

    const [a, b] = await Promise.all([auth.getSession(), auth.getSession()]);
    expect(calls).toBe(1);
    expect(a?.user.email).toBe('red@uixo.io');
    expect(b?.user.email).toBe('red@uixo.io');
  });
});
