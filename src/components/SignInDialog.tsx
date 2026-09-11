import { useState } from 'react';
import type { AuthResult } from '../lib/auth';

type SignInDialogProps = {
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  onDone: () => void;
};

/**
 * Real accounts, backed by Neon Auth. The password is posted straight to the auth service
 * over its own origin and never touches UIXO's storage or its database.
 */
export function SignInDialog({ onSignIn, onSignUp, onDone }: SignInDialogProps) {
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

  return (
    <>
      <h2>{mode === 'in' ? 'Sign in to UIXO' : 'Create an account'}</h2>
      <p>Keep your lists across devices, and follow what you have submitted.</p>

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
