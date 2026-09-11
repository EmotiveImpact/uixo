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
  /** Hand off to a provider's own sign-in page. Never returns — the browser navigates. */
  signInWithProvider(provider: 'google'): Promise<AuthResult>;
  /** A bearer token for UIXO's own API, or null when signed out. */
  apiToken(): Promise<string | null>;
  readonly isMock: boolean;
};

/**
 * Auth is proxied through this site's own origin so the session cookie is first-party.
 * Talking to Neon Auth directly made it a third-party cookie, which Safari blocks.
 */
const BASE = '/api/auth';

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

  /**
   * Social sign-in is a redirect, not a request: the service replies with a URL and the
   * browser leaves. Anything after the navigation never runs.
   */
  async signInWithProvider(provider) {
    try {
      const data = await call<{ url?: string }>('/sign-in/social', {
        provider,
        callbackURL: `${window.location.origin}/browse`,
      });
      if (!data?.url) return { ok: false, error: 'That sign-in method is unavailable.' };
      window.location.href = data.url;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-in failed.' };
    }
  },

  async signOut() {
    await call('/sign-out', {});
  },

  /**
   * A short-lived signed token for calling UIXO's own API.
   *
   * The session cookie is scoped to the auth service's domain, so the browser will never
   * send it to /api. This is the thing that does travel: the API verifies its signature
   * against the service's published keys.
   */
  async apiToken() {
    const data = await call<{ token?: string }>('/token').catch(() => null);
    return data?.token ?? null;
  },
};

export const auth: AuthProvider = neonAuth;

/** Accounts are only on offer when the provider is real. */
export const authAvailable = !auth.isMock;
