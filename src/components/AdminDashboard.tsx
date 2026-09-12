import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Database,
  ExternalLink,
  Inbox,
  Radar,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { ServerReport, ServerSubmission } from '../lib/api';
import { registryRequest } from '../lib/asset-library';
import type { RegistryStatus } from '../lib/asset-library';
import { navigateInApp } from '../lib/navigation';
import { staleResources } from '../lib/submissions';
import { resources } from '../data';
import type { User } from '../types';

type OperatorRow = { id: string };

type Props = {
  user: User;
  onOpenResource: (id: string) => void;
  onOpenWebsiteReview: () => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminDashboard({ user, onOpenResource, onOpenWebsiteReview }: Props) {
  const [submissions, setSubmissions] = useState<ServerSubmission[]>([]);
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [registry, setRegistry] = useState<RegistryStatus | null>(null);
  const [assetQueue, setAssetQueue] = useState<OperatorRow[]>([]);
  const [jobs, setJobs] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let live = true;
    void Promise.allSettled([
      api.listSubmissions(),
      api.listReports(),
      registryRequest<RegistryStatus>('status', { authenticated: true }),
      registryRequest<{ items: OperatorRow[] }>('queue', { authenticated: true }),
      registryRequest<{ items: OperatorRow[] }>('jobs', { authenticated: true }),
    ]).then(([submissionResult, reportResult, registryResult, queueResult, jobsResult]) => {
      if (!live) return;

      const problems: string[] = [];
      if (submissionResult.status === 'fulfilled') {
        if (submissionResult.value.ok) setSubmissions(submissionResult.value.data.submissions);
        else problems.push(submissionResult.value.error);
      } else problems.push('Website submissions are unavailable.');
      if (reportResult.status === 'fulfilled') {
        if (reportResult.value.ok) setReports(reportResult.value.data.reports);
        else problems.push(reportResult.value.error);
      } else problems.push('Reports are unavailable.');
      if (registryResult.status === 'fulfilled') setRegistry(registryResult.value);
      else problems.push('Registry status is unavailable.');
      if (queueResult.status === 'fulfilled') setAssetQueue(queueResult.value.items);
      else problems.push('Asset review queue requires a connected writable registry.');
      if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value.items);
      else problems.push('Indexing runs require a connected writable registry.');

      setError([...new Set(problems)].join(' '));
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, [revision]);

  const pending = useMemo(
    () => submissions.filter((entry) => entry.status === 'pending'),
    [submissions],
  );
  const stale = useMemo(() => staleResources(resources), []);

  async function decide(id: string, status: 'approved' | 'declined') {
    setBusyId(id);
    const result = await api.setSubmissionStatus(id, status);
    if (result.ok) {
      setSubmissions((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, status } : entry)),
      );
    } else {
      setError(result.error);
    }
    setBusyId('');
  }

  async function resolve(resourceId: string) {
    setBusyId(resourceId);
    const result = await api.resolveReport(resourceId);
    if (result.ok) setReports((current) => current.filter((row) => row.resource_id !== resourceId));
    else setError(result.error);
    setBusyId('');
  }

  const attentionCount = pending.length + reports.length + assetQueue.length;
  const openInApp = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateInApp(href);
  };

  return (
    <div className="admin-dashboard" id="admin-overview">
      <header className="admin-intro">
        <div>
          <p className="admin-eyebrow">
            <ShieldCheck size={13} /> Signed in as {user.email}
          </p>
          <h2>Keep the catalogue useful.</h2>
          <p>Review what came in, fix what drifted, and keep the source index moving.</p>
        </div>
        <button
          className="admin-refresh"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError('');
            setRevision((x) => x + 1);
          }}
        >
          <RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="admin-metrics" aria-label="Admin summary">
        <div>
          <span>{attentionCount}</span>
          <small>Needs attention</small>
        </div>
        <div>
          <span>{registry?.stats.assets ?? '—'}</span>
          <small>Published assets</small>
        </div>
        <div>
          <span>{registry?.stats.providers ?? '—'}</span>
          <small>Indexed sources</small>
        </div>
        <div>
          <span>{jobs.length}</span>
          <small>Indexing runs</small>
        </div>
      </section>

      {error && (
        <p className="admin-notice" role="status">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      <div className="admin-columns">
        <div className="admin-stack">
          <section
            className="admin-panel admin-scroll-target"
            id="admin-submissions-panel"
            aria-labelledby="admin-submissions"
          >
            <div className="admin-panel-heading">
              <div>
                <Inbox size={15} />
                <h3 id="admin-submissions">Website submissions</h3>
              </div>
              <span>{pending.length}</span>
            </div>
            {loading && !submissions.length ? (
              <p className="admin-empty">Loading submissions…</p>
            ) : !pending.length ? (
              <p className="admin-empty">Nothing is waiting for review.</p>
            ) : (
              <ul className="admin-rows">
                {pending.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <strong>{item.name}</strong>
                      <small>{item.note || item.url}</small>
                    </a>
                    <button
                      aria-label={`Approve ${item.name}`}
                      disabled={busyId === item.id}
                      onClick={() => void decide(item.id, 'approved')}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      aria-label={`Decline ${item.name}`}
                      disabled={busyId === item.id}
                      onClick={() => void decide(item.id, 'declined')}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="admin-panel admin-scroll-target"
            id="admin-reports-panel"
            aria-labelledby="admin-reports"
          >
            <div className="admin-panel-heading">
              <div>
                <AlertTriangle size={15} />
                <h3 id="admin-reports">Reported websites</h3>
              </div>
              <span>{reports.length}</span>
            </div>
            {!reports.length ? (
              <p className="admin-empty">No open reports.</p>
            ) : (
              <ul className="admin-rows">
                {reports.slice(0, 6).map((report) => (
                  <li key={report.id}>
                    <button
                      className="admin-row-main"
                      onClick={() => onOpenResource(report.resource_id)}
                    >
                      <strong>{report.name}</strong>
                      <small>
                        {report.reason} · {formatDate(report.reported_at)}
                      </small>
                    </button>
                    <button
                      aria-label={`Resolve report for ${report.name}`}
                      disabled={busyId === report.resource_id}
                      onClick={() => void resolve(report.resource_id)}
                    >
                      <Check size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="admin-stack">
          <section className="admin-panel admin-operations" aria-labelledby="admin-operations">
            <div className="admin-panel-heading">
              <div>
                <Radar size={15} />
                <h3 id="admin-operations">Operations</h3>
              </div>
            </div>
            <a
              href="/browse/assets?view=review"
              onClick={(event) => openInApp(event, '/browse/assets?view=review')}
            >
              <span>
                <strong>Asset review</strong>
                <small>{assetQueue.length} staged revisions</small>
              </span>
              <ArrowRight size={14} />
            </a>
            <a
              href="/browse/assets?view=scout"
              onClick={(event) => openInApp(event, '/browse/assets?view=scout')}
            >
              <span>
                <strong>Scout intake</strong>
                <small>Import source discoveries</small>
              </span>
              <ArrowRight size={14} />
            </a>
            <a
              href="/browse/assets?view=jobs"
              onClick={(event) => openInApp(event, '/browse/assets?view=jobs')}
            >
              <span>
                <strong>Indexing runs</strong>
                <small>{jobs.length} recorded runs</small>
              </span>
              <ArrowRight size={14} />
            </a>
            <button onClick={onOpenWebsiteReview}>
              <span>
                <strong>Candidate files</strong>
                <small>Review editorial website imports</small>
              </span>
              <ArrowRight size={14} />
            </button>
          </section>

          <section
            className="admin-panel admin-scroll-target"
            id="admin-registry-panel"
            aria-labelledby="admin-health"
          >
            <div className="admin-panel-heading">
              <div>
                <Database size={15} />
                <h3 id="admin-health">Registry health</h3>
              </div>
              <span className={registry?.readOnly ? 'admin-state-warning' : 'admin-state-ok'}>
                {registry ? (registry.readOnly ? 'Read only' : 'Connected') : 'Checking'}
              </span>
            </div>
            <dl className="admin-facts">
              <div>
                <dt>Storage</dt>
                <dd>{registry?.storage ?? '—'}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{registry?.role ?? '—'}</dd>
              </div>
              <div>
                <dt>Search</dt>
                <dd>{registry?.searchMode ?? 'weighted keyword'}</dd>
              </div>
              <div>
                <dt>Agent runtime</dt>
                <dd>{registry?.eveConfigured ? 'Connected' : 'Not configured'}</dd>
              </div>
            </dl>
            <a
              className="admin-inline-link"
              href="/api/registry?action=status"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open status endpoint <ExternalLink size={13} />
            </a>
          </section>

          <section className="admin-panel" aria-labelledby="admin-stale">
            <div className="admin-panel-heading">
              <div>
                <Clock3 size={15} />
                <h3 id="admin-stale">Needs a source check</h3>
              </div>
              <span>{stale.length}</span>
            </div>
            {!stale.length ? (
              <p className="admin-empty">Every website was checked recently.</p>
            ) : (
              <ul className="admin-rows compact">
                {stale.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <button className="admin-row-main" onClick={() => onOpenResource(item.id)}>
                      <strong>{item.name}</strong>
                      <small>Checked {item.lastChecked}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
