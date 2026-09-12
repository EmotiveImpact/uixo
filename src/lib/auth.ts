export type Role = 'member' | 'curator';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Session = { user: User } | null;

export type AuthResult = { ok: true } | { ok: false; error: string };
export type SocialProvider = 'google' | 'github';

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
  /** A social provider enabled for this Neon Auth branch. */
  signInWithProvider(provider: SocialProvider): Promise<AuthResult>;
  /** A bearer token for UIXO's own API, or null when signed out. */
  apiToken(): Promise<string | null>;
  readonly isMock: boolean;
};

/**
 * Auth is proxied through this site's own origin so the session cookie is first-party.
 * Talking to Neon Auth directly made it a third-party cookie, which Safari blocks.
 *
 * Better Auth rejects a relative base URL, so the official client needs an absolute one.
 */
function appOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  const url = new URL(window.location.origin);
  if (url.hostname === '127.0.0.1') url.hostname = 'localhost';
  return url.origin;
}

function authUrl(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/api/auth`;
  return 'http://localhost:3000/api/auth';
}

const VERIFIER = 'neon_auth_session_verifier';
const OAUTH_PENDING = 'uixo.oauth-pending';

type BetterAuthUser = { id: string; name?: string; email: string; role?: string };

type SessionPayload = {
  user?: BetterAuthUser | null;
  session?: unknown;
};

/** Only an explicit admin role curates. Everyone else is a member. */
function toUser(raw: BetterAuthUser): User {
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.email.split('@')[0],
    email: raw.email,
    role: raw.role === 'admin' || raw.role === 'curator' ? 'curator' : 'member',
  };
}

export function sessionFrom(data: SessionPayload | null | undefined): Session {
  const user = data?.user;
  return user ? { user: toUser(user) } : null;
}

/**
 * Sessions are cookies issued through this origin, so every call must send credentials.
 */
async function call<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${authUrl()}${path}`, {
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

function takeVerifier(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(VERIFIER);
}

function dropVerifier() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(VERIFIER)) return;
  url.searchParams.delete(VERIFIER);
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function markOAuthPending() {
  try {
    sessionStorage.setItem(OAUTH_PENDING, '1');
  } catch {
    /* private mode */
  }
}

function oauthPending(): boolean {
  try {
    return sessionStorage.getItem(OAUTH_PENDING) === '1';
  } catch {
    return false;
  }
}

function clearOAuthPending() {
  try {
    sessionStorage.removeItem(OAUTH_PENDING);
  } catch {
    /* private mode */
  }
}

async function loadSession(verifier: string | null): Promise<Session> {
  const path = verifier
    ? `/get-session?${VERIFIER}=${encodeURIComponent(verifier)}`
    : '/get-session';
  const data = await call<SessionPayload | null>(path);
  const session = sessionFrom(data);
  if (session) {
    dropVerifier();
    clearOAuthPending();
  }
  return session;
}

let inFlight: Promise<Session> | null = null;
let remembered: { session: Session; at: number } | null = null;
const REMEMBER_MS = 8000;

async function readSessionOnce(): Promise<Session> {
  if (remembered && Date.now() - remembered.at < REMEMBER_MS) return remembered.session;

  const verifier = takeVerifier();
  const pending = oauthPending() || Boolean(verifier);
  const first = await loadSession(verifier);
  if (first) {
    remembered = { session: first, at: Date.now() };
    return first;
  }

  // The verifier is one-shot. React Strict Mode can fire two get-sessions;
  // the first mints the cookie and the second must read that cookie, not
  // replay the verifier. A refresh "fixing" it is that second read, late.
  if (!pending) return null;

  for (const wait of [50, 150, 300, 600, 1200]) {
    await new Promise((resolve) => setTimeout(resolve, wait));
    const next = await loadSession(null);
    if (next) {
      remembered = { session: next, at: Date.now() };
      return next;
    }
  }
  return null;
}

async function readSession(): Promise<Session> {
  if (inFlight) return inFlight;
  inFlight = readSessionOnce().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export const neonAuth: AuthProvider = {
  isMock: false,

  getSession: readSession,

  async signIn(email, password) {
    try {
      const data = await call<SessionPayload>('/sign-in/email', { email, password });
      return sessionFrom(data)
        ? { ok: true }
        : { ok: false, error: 'Could not reach the sign-in service.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-in failed.' };
    }
  },

  async signUp(email, password, name) {
    try {
      const data = await call<SessionPayload>('/sign-up/email', { email, password, name });
      return sessionFrom(data)
        ? { ok: true }
        : { ok: false, error: 'Could not reach the sign-up service.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-up failed.' };
    }
  },

  /**
   * Neon Auth owns the provider exchange. We ask it for the provider URL, then
   * leave this page. Coming back with `neon_auth_session_verifier` is what mints
   * the first-party cookie — do not treat "we have a URL, no session yet" as failure.
   */
  async signInWithProvider(provider) {
    if (provider !== 'google' && provider !== 'github') {
      return { ok: false, error: 'That sign-in method is unavailable.' };
    }
    try {
      const origin = appOrigin();
      const data = await call<{ url?: string }>('/sign-in/social', {
        provider,
        callbackURL: `${origin}/browse`,
        errorCallbackURL: `${origin}/browse`,
      });
      if (data?.url) {
        markOAuthPending();
        window.location.assign(data.url);
        return new Promise<AuthResult>(() => {});
      }
      const session = await readSession();
      return session
        ? { ok: true }
        : {
            ok: false,
            error: `Could not start ${provider === 'google' ? 'Google' : 'GitHub'} sign-in.`,
          };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Sign-in failed.' };
    }
  },

  async signOut() {
    remembered = null;
    clearOAuthPending();
    await call('/sign-out', {});
  },

  /**
   * A short-lived signed token for calling UIXO's own API.
   *
   * The session cookie is scoped to this origin via the /api/auth proxy. The API
   * verifies the token against Neon's published keys.
   */
  async apiToken() {
    const data = await call<{ token?: string }>('/token').catch(() => null);
    return data?.token ?? null;
  },
};

export const auth: AuthProvider = neonAuth;

/** Last successful read, if it is still fresh. Used so an OAuth remount does not flash signed-out. */
export function peekSession(): Session {
  if (remembered && Date.now() - remembered.at < REMEMBER_MS) return remembered.session;
  return null;
}

/** Accounts are only on offer when the provider is real. */
export const authAvailable = !auth.isMock;
