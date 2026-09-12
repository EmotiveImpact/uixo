import { useCallback, useEffect, useState } from 'react';
import { auth, authAvailable, peekSession } from '../lib/auth';
import type { Session, SocialProvider } from '../lib/auth';

/**
 * Three states, not two: until the session request resolves we genuinely do not know
 * whether anyone is signed in, and rendering "signed out" in the meantime makes the UI
 * flicker for anyone who is.
 */
export function useAuth() {
  const [session, setSession] = useState<Session>(peekSession);
  const [settled, setSettled] = useState(!authAvailable || peekSession() !== null);

  const refresh = useCallback(async () => {
    if (!authAvailable) return null;
    const next = await auth.getSession().catch(() => null);
    setSession(next);
    setSettled(true);
    return next;
  }, []);

  // Read the session on mount. OAuth returns through a full navigation; Strict Mode
  // remounts this hook and used to throw away the exchange that minted the cookie.
  useEffect(() => {
    if (!authAvailable) return;
    void auth
      .getSession()
      .catch(() => null)
      .then((next) => {
        setSession(next);
        setSettled(true);
      });
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await auth.signIn(email, password);
      if (result.ok) setSession(await refresh());
      return result;
    },
    [refresh],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const result = await auth.signUp(email, password, name);
      if (result.ok) setSession(await refresh());
      return result;
    },
    [refresh],
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      const result = await auth.signInWithProvider(provider);
      if (result.ok) setSession(await refresh());
      return result;
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, []);

  return {
    available: authAvailable,
    settled,
    session,
    user: session?.user ?? null,
    isCurator: session?.user.role === 'curator',
    signIn,
    signUp,
    signInWithProvider,
    signOut,
  };
}
