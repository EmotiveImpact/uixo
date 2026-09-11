import { AlertTriangle, Check, Download, ExternalLink, ImageOff, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useReviewQueue } from '../hooks/useReviewQueue';
import { accessToPricing, toResourceRows, withEdits } from '../lib/candidates';
import type { CandidateFile, ReviewStatus } from '../lib/candidates';
import { categories } from '../data';
import type { User } from '../types';

type ReviewInboxProps = { user: User };

const STATUS_FILTERS: (ReviewStatus | 'all')[] = [
  'pending',
  'approved',
  'rejected',
  'skipped',
  'all',
];

/** Thumbnails are committed by hand, so the browser can only report what it can fetch. */
function useImagePresence(ids: string[]) {
  const [present, setPresent] = useState<Record<string, boolean>>({});

  const check = async () => {
    const results: Record<string, boolean> = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`/assets/${id}.png`, { method: 'HEAD' });
          results[id] = response.ok;
        } catch {
          results[id] = false;
        }
      }),
    );
    setPresent(results);
  };

  return { present, check };
}

export function ReviewInbox({ user }: ReviewInboxProps) {
  const queue = useReviewQueue(user.id);
  const { state, counts } = queue;

  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { present, check } = useImagePresence(queue.approved.map((entry) => entry.id));

  const visible = useMemo(
    () =>
      state.candidates.filter((candidate) => {
        if (status !== 'all' && queue.statusOf(candidate.id) !== status) return false;
        if (category !== 'All' && candidate.category !== category) return false;
        return true;
      }),
    [state.candidates, status, category, queue],
  );

  const readFile = async (file: File) => {
    try {
      queue.load(JSON.parse(await file.text()) as CandidateFile);
      setSelected(new Set());
    } catch {
      alert('That file is not valid JSON.');
    }
  };

  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const decideSelected = (next: ReviewStatus) => {
    queue.decide([...selected], next);
    setSelected(new Set());
  };

  const exportApproved = () => {
    const rows = toResourceRows(queue.approved);
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'uixo-approved.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const missingImages = queue.approved.filter((entry) => present[entry.id] === false);

  if (!state.candidates.length) {
    return (
      <div className="inbox">
        <section className="panel inbox-empty">
          <h2>
            <Upload size={16} /> Load a scout file
          </h2>
          <p className="panel-empty">
            Drop in <code>data/uixo-candidates.json</code>. Nothing reaches the site until you
            approve it here.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          <button className="primary-action" onClick={() => fileRef.current?.click()}>
            Choose file
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="inbox">
      <section className="stat-row" aria-label="Queue summary">
        {(['pending', 'approved', 'rejected', 'skipped'] as ReviewStatus[]).map((key) => (
          <div
            key={key}
            className={`stat${key === 'pending' && counts.pending ? ' stat-attention' : ''}`}
          >
            <span className="stat-value">{counts[key]}</span>
            <span className="stat-label">{key[0].toUpperCase() + key.slice(1)}</span>
          </div>
        ))}
      </section>

      <div className="inbox-toolbar">
        <div className="segments" role="group" aria-label="Status">
          {STATUS_FILTERS.map((key) => (
            <button
              key={key}
              className={status === key ? 'selected' : ''}
              aria-pressed={status === key}
              onClick={() => setStatus(key)}
            >
              {key[0].toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        <label className="format-filter">
          <span>Category:</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>All</option>
            {categories.map((entry) => (
              <option key={entry.name}>{entry.name}</option>
            ))}
          </select>
        </label>

        <div className="inbox-actions">
          <button onClick={exportApproved} disabled={!queue.approved.length}>
            <Download size={14} /> Export {queue.approved.length} approved
          </button>
          <button onClick={check} disabled={!queue.approved.length}>
            <ImageOff size={14} /> Check images
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="inbox-bulk" role="status">
          <span>{selected.size} selected</span>
          <button className="row-action approve" onClick={() => decideSelected('approved')}>
            <Check size={15} /> Approve
          </button>
          <button className="row-action decline" onClick={() => decideSelected('rejected')}>
            <X size={15} /> Reject
          </button>
          <button className="linkish" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {missingImages.length > 0 && (
        <p className="inbox-warning">
          <AlertTriangle size={14} /> {missingImages.length} approved listing
          {missingImages.length === 1 ? '' : 's'} still need a thumbnail at{' '}
          <code>public/assets/&lt;id&gt;.png</code>.
        </p>
      )}

      <ul className="inbox-list">
        {visible.map((candidate) => {
          const review = state.reviews[candidate.id];
          const merged = withEdits(candidate, review);
          const problems = queue.problemsFor(candidate.id);
          const open = openId === candidate.id;

          return (
            <li key={candidate.id} className={`inbox-item status-${queue.statusOf(candidate.id)}`}>
              <div className="inbox-row">
                <input
                  type="checkbox"
                  checked={selected.has(candidate.id)}
                  onChange={() => toggleSelected(candidate.id)}
                  aria-label={`Select ${merged.name}`}
                />

                <button
                  className="inbox-main"
                  onClick={() => setOpenId(open ? null : candidate.id)}
                >
                  <span className="inbox-name">
                    {merged.name}
                    {candidate.needs_review && <span className="flag">needs review</span>}
                    {problems.length > 0 && (
                      <span className="flag flag-bad">{problems.length} issue</span>
                    )}
                    {present[candidate.id] === false && <span className="flag">no image</span>}
                  </span>
                  <span className="inbox-meta">
                    {merged.category} · {merged.subcategory} ·{' '}
                    {accessToPricing(merged.access) ?? '—'} · {merged.why}
                  </span>
                </button>

                <a
                  className="row-action"
                  href={candidate.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${merged.name}`}
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  className="row-action approve"
                  aria-label={`Approve ${merged.name}`}
                  onClick={() => queue.decide([candidate.id], 'approved')}
                >
                  <Check size={15} />
                </button>
                <button
                  className="row-action decline"
                  aria-label={`Reject ${merged.name}`}
                  onClick={() => queue.decide([candidate.id], 'rejected')}
                >
                  <X size={15} />
                </button>
              </div>

              {open && (
                <div className="inbox-edit">
                  {problems.map((problem) => (
                    <p key={problem.field} className="inbox-problem">
                      <AlertTriangle size={13} /> {problem.message}
                    </p>
                  ))}

                  <label>
                    Description — rewrite this; the scout&rsquo;s note is a research note
                    <textarea
                      rows={3}
                      value={merged.description ?? candidate.why ?? ''}
                      onChange={(event) =>
                        queue.edit(candidate.id, { description: event.target.value })
                      }
                    />
                  </label>

                  <div className="inbox-fields">
                    <label>
                      Category
                      <select
                        value={merged.category}
                        onChange={(event) =>
                          queue.edit(candidate.id, {
                            category: event.target.value,
                            subcategory: '',
                          })
                        }
                      >
                        {categories.map((entry) => (
                          <option key={entry.name}>{entry.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Subcategory
                      <select
                        value={merged.subcategory}
                        onChange={(event) =>
                          queue.edit(candidate.id, { subcategory: event.target.value })
                        }
                      >
                        <option value="">Choose…</option>
                        {(
                          categories.find((entry) => entry.name === merged.category)?.sub ?? []
                        ).map((sub) => (
                          <option key={sub}>{sub}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Pricing
                      <select
                        value={JSON.stringify(merged.access)}
                        onChange={(event) =>
                          queue.edit(candidate.id, { access: JSON.parse(event.target.value) })
                        }
                      >
                        <option value='["Free"]'>Free</option>
                        <option value='["Free","Paid"]'>Freemium</option>
                        <option value='["Paid"]'>Paid</option>
                      </select>
                    </label>

                    <label>
                      Creator
                      <input
                        value={merged.creator ?? ''}
                        onChange={(event) =>
                          queue.edit(candidate.id, { creator: event.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="inbox-edit-actions">
                    <button
                      className="inbox-approve"
                      onClick={() => queue.decide([candidate.id], 'approved')}
                    >
                      <Check size={15} /> Approve
                    </button>
                    <button
                      className="linkish"
                      onClick={() => queue.decide([candidate.id], 'skipped')}
                    >
                      Skip for now
                    </button>
                    {review?.decidedBy && (
                      <span className="inbox-audit">
                        {review.status} by {review.decidedBy} ·{' '}
                        {new Date(review.decidedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!visible.length && <p className="panel-empty">Nothing matches those filters.</p>}
    </div>
  );
}
