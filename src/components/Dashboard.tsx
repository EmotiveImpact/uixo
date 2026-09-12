import { AlertTriangle, Check, Clock, ExternalLink, Inbox, ListChecks, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { staleResources } from '../lib/submissions';
import type { SubmissionStatus } from '../lib/submissions';
import { api } from '../lib/api';
import type { ServerReport, ServerSubmission } from '../lib/api';
import { resources } from '../data';
import type { List, User } from '../types';

type DashboardProps = {
  user: User;
  isCurator: boolean;
  lists: List[];
  onOpenList: (id: string) => void;
  onOpenResource: (id: string) => void;
  onSubmit: () => void;
  onReview: () => void;
  reviewHref: string;
};

function formatDate(iso: string): string {
  if (!iso) return 'unknown date';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'unknown date'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: 'In review',
  approved: 'Published',
  declined: 'Not a fit',
};

export function Dashboard({
  user,
  isCurator,
  lists,
  onOpenList,
  onOpenResource,
  onSubmit,
  onReview,
  reviewHref,
}: DashboardProps) {
  const [submissions, setSubmissions] = useState<ServerSubmission[]>([]);
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [loading, setLoading] = useState(isCurator);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Only a curator may read these, so only a curator asks.
  useEffect(() => {
    if (!isCurator) return;
    let live = true;

    void Promise.all([api.listSubmissions(), api.listReports()]).then(([subs, reps]) => {
      if (!live) return;
      if (subs.ok) setSubmissions(subs.data.submissions);
      if (reps.ok) setReports(reps.data.reports);
      if (!subs.ok || !reps.ok) {
        setLoadError(subs.ok ? (reps.ok ? null : reps.error) : subs.error);
      }
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, [isCurator]);

  const decide = async (id: string, status: SubmissionStatus) => {
    const before = submissions;
    setSubmissions((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, status } : entry)),
    );
    const result = await api.setSubmissionStatus(id, status);
    // Put it back if the server disagreed, rather than showing a decision that did not stick.
    if (!result.ok) setSubmissions(before);
  };

  const resolve = async (resourceId: string) => {
    const before = reports;
    setReports((current) => current.filter((entry) => entry.resource_id !== resourceId));
    const result = await api.resolveReport(resourceId);
    if (!result.ok) setReports(before);
  };

  // Submissions are anonymous today, so a member has nothing of their own to show yet.
  const mine = useMemo(() => (isCurator ? submissions : []), [submissions, isCurator]);
  const pending = useMemo(
    () => submissions.filter((entry) => entry.status === 'pending'),
    [submissions],
  );
  const openReports = reports;
  const stale = useMemo(() => staleResources(resources), []);

  const savedCount = new Set(lists.flatMap((list) => list.resourceIds)).size;
  const greetingName = user.name.split(' ')[0];

  return (
    <div className="dashboard">
      <section className="stat-row" aria-label="Summary">
        <div className="stat">
          <span className="stat-value">{savedCount}</span>
          <span className="stat-label">Saved websites</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lists.length}</span>
          <span className="stat-label">List{lists.length === 1 ? '' : 's'}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{mine.length}</span>
          <span className="stat-label">Submissions</span>
        </div>
        {isCurator && (
          <div className="stat stat-attention">
            <span className="stat-value">{pending.length + openReports.length}</span>
            <span className="stat-label">Needs review</span>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="lists-heading">
        <h2 id="lists-heading">
          <ListChecks size={16} /> {greetingName}&rsquo;s lists
        </h2>
        {lists.length === 0 ? (
          <p className="panel-empty">No lists yet.</p>
        ) : (
          <ul className="panel-rows">
            {lists.map((list) => (
              <li key={list.id}>
                <button className="row-main" onClick={() => onOpenList(list.id)}>
                  <span>{list.name}</span>
                  <span className="row-meta">
                    {list.resourceIds.length} website{list.resourceIds.length === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="panel-note">Saved on your account. They come with you on another device.</p>
      </section>

      {loadError && (
        <p className="inbox-warning" role="status">
          <AlertTriangle size={14} /> {loadError}
        </p>
      )}

      <section className="panel" aria-labelledby="submissions-heading">
        <h2 id="submissions-heading">
          <Inbox size={16} /> Your submissions
        </h2>
        {loading ? (
          <p className="panel-empty">Loading…</p>
        ) : mine.length === 0 ? (
          <p className="panel-empty">
            Nothing submitted yet.{' '}
            <button className="linkish" onClick={onSubmit}>
              Suggest a website
            </button>
          </p>
        ) : (
          <ul className="panel-rows">
            {mine.map((submission) => (
              <li key={submission.id}>
                <div className="row-main static">
                  <span>{submission.name}</span>
                  <span className="row-meta">
                    <span className={`status status-${submission.status}`}>
                      {STATUS_LABEL[submission.status]}
                    </span>
                    {formatDate(submission.submitted_at)}
                  </span>
                </div>
                <a
                  className="row-action"
                  href={submission.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${submission.name}`}
                >
                  <ExternalLink size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isCurator && (
        <>
          <section className="panel" aria-labelledby="candidates-heading">
            <h2 id="candidates-heading">
              <Inbox size={16} /> Scout candidates
            </h2>
            <p className="panel-empty">
              Staged listings from the scout, waiting on a human.{' '}
              <a
                className="linkish"
                href={reviewHref}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                  event.preventDefault();
                  onReview();
                }}
              >
                Open the review inbox
              </a>
            </p>
          </section>

          <section className="panel" aria-labelledby="queue-heading">
            <h2 id="queue-heading">
              <Inbox size={16} /> Review queue
              {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
            </h2>
            {loading ? (
              <p className="panel-empty">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="panel-empty">Nothing waiting.</p>
            ) : (
              <ul className="panel-rows">
                {pending.map((submission) => (
                  <li key={submission.id}>
                    <div className="row-main static">
                      <span>{submission.name}</span>
                      <span className="row-meta">
                        {submission.url} · {formatDate(submission.submitted_at)}
                      </span>
                    </div>
                    <button
                      className="row-action approve"
                      aria-label={`Approve ${submission.name}`}
                      onClick={() => void decide(submission.id, 'approved')}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="row-action decline"
                      aria-label={`Decline ${submission.name}`}
                      onClick={() => void decide(submission.id, 'declined')}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="panel-note">
              Approving records the decision. Publishing still means adding the listing to
              <code> src/content/resources.json</code> until the backend owns the content.
            </p>
          </section>

          <section className="panel" aria-labelledby="reports-heading">
            <h2 id="reports-heading">
              <AlertTriangle size={16} /> Reported links
              {openReports.length > 0 && <span className="count-pill">{openReports.length}</span>}
            </h2>
            {openReports.length === 0 ? (
              <p className="panel-empty">No open reports.</p>
            ) : (
              <ul className="panel-rows">
                {openReports.map((report) => {
                  const resource = resources.find((entry) => entry.id === report.resource_id);
                  return (
                    <li key={report.resource_id}>
                      <button
                        className="row-main"
                        onClick={() => onOpenResource(report.resource_id)}
                      >
                        <span>{resource?.name ?? report.name}</span>
                        <span className="row-meta">
                          {report.reason} · {formatDate(report.reported_at)}
                        </span>
                      </button>
                      <button
                        className="row-action approve"
                        aria-label={`Mark ${resource?.name ?? report.name} resolved`}
                        onClick={() => void resolve(report.resource_id)}
                      >
                        <Check size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="stale-heading">
            <h2 id="stale-heading">
              <Clock size={16} /> Not checked recently
              {stale.length > 0 && <span className="count-pill">{stale.length}</span>}
            </h2>
            {stale.length === 0 ? (
              <p className="panel-empty">Every listing has been checked in the last 90 days.</p>
            ) : (
              <ul className="panel-rows">
                {stale.map((resource) => (
                  <li key={resource.id}>
                    <button className="row-main" onClick={() => onOpenResource(resource.id)}>
                      <span>{resource.name}</span>
                      <span className="row-meta">Last checked {resource.lastChecked}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
