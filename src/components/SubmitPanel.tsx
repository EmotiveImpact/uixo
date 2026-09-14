import { ArrowRight, Check, Link2, RotateCcw, ShieldCheck } from 'lucide-react';
import { ToggleGroup } from 'radix-ui';
import { useState } from 'react';
import { api } from '../lib/api';
import { addSubmission } from '../lib/submissions';

type SubmitPanelProps = { userId: string | null };
type Outcome = { kind: 'sent' | 'local'; message: string };

const CATEGORIES = [
  'Components',
  'UI libraries',
  'Templates',
  'Icons',
  'Backgrounds',
  'Illustrations',
  'Fonts',
  'Mockups',
  'Inspiration',
  'Marketplace',
  'Other',
] as const;

const PRICING = ['Free', 'Freemium', 'Paid', 'Not sure'] as const;

function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function domainFromUrl(value: string) {
  try {
    return new URL(normaliseUrl(value)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function submissionNote(category: string, pricing: string, note: string) {
  const context = `Category: ${category} · Pricing: ${pricing}`;
  return note.trim() ? `${context}\n${note.trim()}` : context;
}

/**
 * Suggestions go to the server. If it cannot be reached the suggestion is kept in this
 * browser rather than thrown away, and the visitor is told which of the two happened.
 */
export function SubmitPanel({ userId }: SubmitPanelProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<string>('Components');
  const [pricing, setPricing] = useState<string>('Free');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const domain = domainFromUrl(url);

  const reset = () => {
    setName('');
    setUrl('');
    setCategory('Components');
    setPricing('Free');
    setNote('');
    setOutcome(null);
    setError(null);
  };

  if (outcome) {
    return (
      <section className="submit-result" aria-live="polite">
        <span className="submit-result-icon" aria-hidden="true">
          <Check size={20} strokeWidth={2} />
        </span>
        <span className="submit-kicker">SUGGESTION RECEIVED</span>
        <h2 id="dialog-title">It’s in the queue.</h2>
        <p>{outcome.message}</p>
        <div className="submit-result-summary">
          <span>{name}</span>
          <small>{domain || url}</small>
        </div>
        <button type="button" className="submit-again" onClick={reset}>
          <RotateCcw size={14} /> Submit another
        </button>
      </section>
    );
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const websiteUrl = normaliseUrl(url);
    setUrl(websiteUrl);
    setBusy(true);
    setError(null);

    const input = {
      name: name.trim(),
      url: websiteUrl,
      note: submissionNote(category, pricing, note).slice(0, 500),
    };

    const result = await api.submit(input);
    if (result.ok) {
      setOutcome({
        kind: 'sent',
        message: result.data.duplicate
          ? 'It was already waiting for review, so we kept the existing suggestion.'
          : 'A person will check the source, quality and listing details before it appears on UIXO.',
      });
    } else if (result.status === 0 || result.status === 503) {
      const kept = addSubmission(input, userId);
      if (kept.length) {
        setOutcome({
          kind: 'local',
          message:
            'UIXO was briefly unavailable, so this suggestion is safely stored in this browser.',
        });
      } else {
        setError(
          'UIXO could not be reached and this browser would not store the suggestion. Try again.',
        );
      }
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  return (
    <section className="submit-panel">
      <header className="submit-header">
        <span className="submit-kicker">SUBMIT TO UIXO</span>
        <h2 id="dialog-title">Share something worth keeping.</h2>
        <p>Send us a useful design resource. Every submission is checked by a person.</p>
      </header>

      <form className="submit-form" onSubmit={onSubmit}>
        <div className="submit-field-grid">
          <label className="submit-field">
            <span>Website name</span>
            <input
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="organization"
              placeholder="e.g. Motion Primitives"
            />
          </label>

          <label className="submit-field">
            <span>Website URL</span>
            <span className="submit-url-input">
              <Link2 size={15} aria-hidden="true" />
              <input
                name="url"
                type="url"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onBlur={() => setUrl((current) => normaliseUrl(current))}
                autoComplete="url"
                inputMode="url"
                placeholder="example.com"
              />
            </span>
            {domain && <small className="submit-domain">We’ll review {domain}</small>}
          </label>
        </div>

        <div className="submit-field-grid submit-context-grid">
          <label className="submit-field">
            <span>Best fit</span>
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <fieldset className="submit-field submit-pricing">
            <legend>Pricing</legend>
            <ToggleGroup.Root
              className="submit-price-options"
              type="single"
              value={pricing}
              onValueChange={(value) => value && setPricing(value)}
              aria-label="Website pricing"
            >
              {PRICING.map((item) => (
                <ToggleGroup.Item key={item} value={item} aria-label={item}>
                  {item}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </fieldset>
        </div>

        <label className="submit-field submit-note">
          <span>
            Why should it be listed? <small>{note.length}/360</small>
          </span>
          <textarea
            name="note"
            maxLength={360}
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What makes it useful, distinctive or especially well made?"
          />
        </label>

        {error && (
          <p className="submit-error" role="alert">
            {error}
          </p>
        )}

        <div className="submit-footer">
          <div className="submit-promise">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Human reviewed
              <small>
                {userId ? 'Track the result from your dashboard.' : 'No account required.'}
              </small>
            </span>
          </div>
          <button className="primary submit-button" disabled={busy}>
            {busy ? 'Sending…' : 'Send for review'}
            {!busy && <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </section>
  );
}
