import { useState } from 'react';
import { api } from '../lib/api';
import { addSubmission } from '../lib/submissions';

type SubmitPanelProps = { userId: string | null };
type Outcome = { kind: 'sent' | 'local' | 'failed'; message: string };

/**
 * Suggestions go to the server. If it cannot be reached the suggestion is kept in this
 * browser rather than thrown away, and the visitor is told which of the two happened —
 * quietly pretending a lost suggestion was received is the one thing worth avoiding.
 */
export function SubmitPanel({ userId }: SubmitPanelProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  if (outcome) {
    return (
      <>
        <h2>{outcome.kind === 'failed' ? 'That did not save.' : 'Thank you.'}</h2>
        <p>{outcome.message}</p>
      </>
    );
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);

    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get('name') ?? ''),
      url: String(data.get('url') ?? ''),
      note: String(data.get('note') ?? ''),
    };

    const result = await api.submit(input);
    if (result.ok) {
      setOutcome({
        kind: 'sent',
        message: result.data.duplicate
          ? 'Someone already suggested that one — it is in the queue.'
          : 'Your suggestion is in the review queue.',
      });
    } else if (result.status === 0 || result.status === 503) {
      const kept = addSubmission(input, userId);
      setOutcome(
        kept.length
          ? {
              kind: 'local',
              message: 'The server could not be reached, so this is saved in your browser for now.',
            }
          : {
              kind: 'failed',
              message: 'The server could not be reached and your browser refused to store it.',
            },
      );
    } else {
      setOutcome({ kind: 'failed', message: result.error });
    }
    setBusy(false);
  };

  return (
    <>
      <h2>Found something good?</h2>
      <p>Tell us what it is and why it earns a place.</p>
      <form onSubmit={onSubmit}>
        <label>
          Website name
          <input name="name" required maxLength={120} placeholder="A resource worth sharing" />
        </label>
        <label>
          Website URL
          <input name="url" type="url" required placeholder="https://" />
        </label>
        <label>
          Why it is worth listing
          <input name="note" maxLength={500} placeholder="One sentence is plenty" />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? 'Sending…' : 'Send suggestion'}
        </button>
        <small>Every suggestion is read by a person before anything is listed.</small>
      </form>
    </>
  );
}
