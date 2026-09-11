export type Role = 'member' | 'curator';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Session = { user: User } | null;

export type AuthResult = { ok: true } | { ok: false; error: string };

/**
 * Everything the app needs from an identity provider.
 *
 * `getSession` is async because a real one always is — the browser holds a cookie, not a
 * user. Components render an unknown state first and settle once it resolves.
 */
export type AuthProvider = {
  getSession(): Promise<Session>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, name: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  readonly isMock: boolean;
};

/** Neon Auth is Better Auth; these are its own route names. */
const BASE = (import.meta.env.VITE_NEON_AUTH_URL ?? '').replace(/\/+$/, '');

/**
 * Sessions are cookies issued by Neon Auth on its own origin, so every call must send
 * credentials. Nothing is stored by the app: there is no token in localStorage to steal,
 * and signing out is the server's business rather than ours to forget.
 */
async function call<T>(path: string, body?: unknown): Promise<T | null> {
  if (!BASE) return null;
  try {
    const response = await fetch(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const parsed = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Request failed')) throw error;
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    return null;
  }
}

type BetterAuthUser = { id: string; name?: string; email: string; role?: string };

/** Only an explicit admin role curates. Everyone else is a member. */
function toUser(raw: BetterAuthUser): User {
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.email.split('@')[0],
    email: raw.email,
    role: raw.role === 'admin' || raw.role === 'curator' ? 'curator' : 'member',
  };
}

export const neonAuth: AuthProvider = {
  isMock: false,

  async getSession() {
    const data = await call<{ user?: BetterAuthUser; session?: unknown } | null>('/get-session');
    return data?.user && data.session ? { user: toUser(data.user) } : null;
  },

  async signIn(email, password) {
    try {
      const data = await call<{ user?: BetterAuthUser }>('/sign-in/email', { email, password });
      return data?.user
        ? { ok: true }
        : { ok: false, error: 'Could not reach the sign-in service.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-in failed.' };
    }
  },

  async signUp(email, password, name) {
    try {
      const data = await call<{ user?: BetterAuthUser }>('/sign-up/email', {
        email,
        password,
        name,
      });
      return data?.user
        ? { ok: true }
        : { ok: false, error: 'Could not reach the sign-up service.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-up failed.' };
    }
  },

  async signOut() {
    await call('/sign-out', {});
  },
};

export const auth: AuthProvider = neonAuth;

/** Accounts are only on offer when the provider is real and configured. */
export const authAvailable = !auth.isMock && Boolean(BASE);

if (!authAvailable) {
  console.warn('UIXO: accounts are hidden because VITE_NEON_AUTH_URL is not configured.');
}
