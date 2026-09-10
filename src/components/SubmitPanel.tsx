import { useState } from 'react';
import { addSubmission } from '../lib/submissions';

type SubmitPanelProps = { userId: string | null };

/** Suggestions are kept in this browser until a backend accepts them. */
export function SubmitPanel({ userId }: SubmitPanelProps) {
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);

  if (submitted) {
    return (
      <>
        <h2>Suggestion saved.</h2>
        <p>
          It is in the review queue.{' '}
          {userId
            ? 'You can follow it from your dashboard.'
            : 'Sign in to follow what happens to it.'}
        </p>
      </>
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const before = addSubmission(
      {
        name: String(data.get('name') ?? ''),
        url: String(data.get('url') ?? ''),
        note: String(data.get('note') ?? ''),
      },
      userId,
    );
    if (before.length) setSubmitted(true);
    else setFailed(true);
  };

  return (
    <>
      <h2>Found something good?</h2>
      <p>Tell us what it is and why it earns a place.</p>
      <form onSubmit={onSubmit}>
        <label>
          Website name
          <input name="name" required placeholder="A resource worth sharing" />
        </label>
        <label>
          Website URL
          <input name="url" type="url" required placeholder="https://" />
        </label>
        <label>
          Why it is worth listing
          <input name="note" placeholder="One sentence is plenty" />
        </label>
        <button className="primary">Save suggestion</button>
        {failed && <small>Browser storage is unavailable, so nothing was saved.</small>}
        <small>Prototype: saved in this browser only. Nothing is sent anywhere yet.</small>
      </form>
    </>
  );
}
