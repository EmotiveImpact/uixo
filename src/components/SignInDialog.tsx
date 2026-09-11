import { useState } from 'react';

type SignInDialogProps = {
  isMock: boolean;
  onSignIn: (email: string, name?: string) => Promise<void>;
};

/**
 * Sign-in surface for the mock provider. It sends whatever is typed to the configured
 * AuthProvider and stores nothing itself — when a real backend is wired up, only the
 * provider changes.
 */
export function SignInDialog({ isMock, onSignIn }: SignInDialogProps) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <h2>Sign in to UIXO</h2>
      <p>Keep your lists across devices, and follow what you have submitted.</p>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!email.trim() || busy) return;
          setBusy(true);
          await onSignIn(email.trim());
          setBusy(false);
        }}
      >
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>

      {isMock && (
        <small>
          Development stand-in: no password, no verification, and the session lives only in this
          browser. Replace the provider in <code>src/lib/auth.ts</code> before this goes live. An
          address containing “curator” gets the moderation views.
        </small>
      )}
    </>
  );
}
