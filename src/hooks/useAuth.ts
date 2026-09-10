import { useCallback, useEffect, useState } from 'react';
import { auth } from '../lib/auth';
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
    session,
    user: session?.user ?? null,
    isCurator: session?.user.role === 'curator',
    isMock: auth.isMock,
    signIn,
    signOut,
  };
}
