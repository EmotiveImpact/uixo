import { readStored, writeStored } from './storage';

export type Role = 'member' | 'curator';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Session = { user: User } | null;

/**
 * Everything the app needs from an identity provider.
 *
 * The app talks to this interface and nothing else, so swapping the local mock below
 * for a real backend is a one-file change: implement these five methods and export the
 * new provider as `auth`. No component imports a provider directly.
 */
export type AuthProvider = {
  /** Current session, or null. Synchronous so the first render is never a spinner. */
  getSession(): Session;
  signIn(email: string, name?: string): Promise<Session>;
  signOut(): Promise<void>;
  /** Subscribe to session changes; returns an unsubscribe function. */
  subscribe(listener: (session: Session) => void): () => void;
  /** True when this provider is a stand-in rather than a real backend. */
  readonly isMock: boolean;
};

const SESSION_KEY = 'uixo-session';
const listeners = new Set<(session: Session) => void>();

function emit(session: Session) {
  for (const listener of listeners) listener(session);
}

/**
 * A local stand-in so the signed-in experience can be built and reviewed before the
 * backend exists. It stores a session in localStorage and verifies nothing — it must not
 * ship to production. Anyone using an address on CURATOR_HINTS is treated as a curator so
 * the moderation views are reachable while developing.
 */
const CURATOR_HINTS = ['curator', 'admin', 'uixo'];

export const mockAuth: AuthProvider = {
  isMock: true,

  getSession() {
    return readStored<Session>(SESSION_KEY, null);
  },

  async signIn(email, name) {
    const handle = email.split('@')[0] || 'friend';
    const session: Session = {
      user: {
        id: `u_${handle.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        name:
          name?.trim() || handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        role: CURATOR_HINTS.some((hint) => email.toLowerCase().includes(hint))
          ? 'curator'
          : 'member',
      },
    };
    writeStored(SESSION_KEY, session);
    emit(session);
    return session;
  },

  async signOut() {
    writeStored(SESSION_KEY, null);
    emit(null);
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Swap this for the real provider once the backend lands. */
export const auth: AuthProvider = mockAuth;

/**
 * The mock issues a session to any address with no verification of any kind. Shipping it
 * would be an open door, so fail loudly at startup rather than quietly in production.
 * Set VITE_ALLOW_MOCK_AUTH=true to preview a production build locally.
 */
if (import.meta.env.PROD && auth.isMock && import.meta.env.VITE_ALLOW_MOCK_AUTH !== 'true') {
  throw new Error(
    'Refusing to start: src/lib/auth.ts still exports the mock provider, which authenticates ' +
      'nobody. Implement AuthProvider against the real backend before deploying.',
  );
}
