import { useCallback, useEffect, useState } from 'react';
import { auth, authAvailable } from '../lib/auth';
import type { Session } from '../lib/auth';

/**
 * Three states, not two: until the session request resolves we genuinely do not know
 * whether anyone is signed in, and rendering "signed out" in the meantime makes the UI
 * flicker for anyone who is.
 */
export function useAuth() {
  const [session, setSession] = useState<Session>(null);
  const [settled, setSettled] = useState(!authAvailable);

  const refresh = useCallback(async () => {
    if (!authAvailable) return null;
    return auth.getSession().catch(() => null);
  }, []);

  // Read the session once on mount. The effect subscribes to an external system — the
  // auth service — rather than deriving state, and ignores a result that arrives after
  // unmount.
  useEffect(() => {
    if (!authAvailable) return;
    let live = true;
    void auth
      .getSession()
      .catch(() => null)
      .then((next) => {
        if (!live) return;
        setSession(next);
        setSettled(true);
      });
    return () => {
      live = false;
    };
  }, []);

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
    (provider: 'google') => auth.signInWithProvider(provider),
    [],
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
