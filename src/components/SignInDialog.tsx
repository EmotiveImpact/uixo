import { Github } from 'lucide-react';
import { useState } from 'react';
import type { AuthResult, SocialProvider } from '../lib/auth';

type SignInDialogProps = {
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  onProvider: (provider: SocialProvider) => Promise<AuthResult>;
  onDone: () => void;
};

/** Google's mark, so the button is recognisable rather than a generic one. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Real accounts, backed by Neon Auth and proxied through this site's own origin so the
 * session cookie is first-party. Google uses Neon's shared keys; GitHub uses UIXO's app.
 */
export function SignInDialog({ onSignIn, onSignUp, onProvider, onDone }: SignInDialogProps) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const name = String(data.get('name') ?? '').trim();

    const result =
      mode === 'in' ? await onSignIn(email, password) : await onSignUp(email, password, name);

    if (result.ok) onDone();
    else setError(result.error);
    setBusy(false);
  };

  const continueWith = async (provider: SocialProvider) => {
    setBusy(true);
    setError(null);
    const result = await onProvider(provider);
    if (result.ok) onDone();
    else setError(result.error);
    setBusy(false);
  };

  return (
    <>
      <h2>{mode === 'in' ? 'Sign in to UIXO' : 'Create an account'}</h2>
      <p>Keep your lists across devices, and follow what you have submitted.</p>

      <button
        type="button"
        className="provider-button"
        disabled={busy}
        onClick={() => void continueWith('google')}
      >
        <GoogleMark /> Continue with Google
      </button>

      <button
        type="button"
        className="provider-button"
        disabled={busy}
        onClick={() => void continueWith('github')}
      >
        <Github size={16} aria-hidden="true" /> Continue with GitHub
      </button>

      <p className="auth-divider">
        <span>or</span>
      </p>

      <form onSubmit={submit}>
        {mode === 'up' && (
          <label>
            Your name
            <input name="name" required autoComplete="name" placeholder="Alex" />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            placeholder="At least 8 characters"
          />
        </label>

        {error && <small className="auth-error">{error}</small>}

        <button className="primary" disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>

        <small>
          {mode === 'in' ? 'No account yet? ' : 'Already have one? '}
          <button
            type="button"
            className="linkish"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError(null);
            }}
          >
            {mode === 'in' ? 'Create one' : 'Sign in'}
          </button>
        </small>
      </form>
    </>
  );
}
