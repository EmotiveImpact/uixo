import { useCallback, useEffect, useState } from 'react';
import { auth, authAvailable } from '../lib/auth';
import type { Session } from '../lib/auth';

export function useAuth() {
  const [session, setSession] = useState<Session>(() => auth.getSession());

  useEffect(() => auth.subscribe(setSession), []);

  const signIn = useCallback(
    (email: string, name?: string) => auth.signIn(email, name).then(() => undefined),
    [],
  );
  const signOut = useCallback(() => auth.signOut(), []);

  return {
    /** False when accounts are not on offer, e.g. production with the mock provider. */
    available: authAvailable,
    session: authAvailable ? session : null,
    user: authAvailable ? (session?.user ?? null) : null,
    isCurator: authAvailable && session?.user.role === 'curator',
    isMock: auth.isMock,
    signIn,
    signOut,
  };
}
