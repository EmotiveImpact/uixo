import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { AssetRecord, ProviderRecord } from '../lib/asset-library';
import type {
  CandidateDetail,
  OperationsReport,
  PipelineStage,
  OperationJob,
} from '../../shared/intelligence';
import { RegistryLink, RegistryState, type IntelligenceProps } from './RegistryPrimitives';
import { useRegistryData } from '../hooks/useRegistryData';

const stages: { id: PipelineStage; label: string }[] = [
  { id: 'discovered', label: 'Discovered' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'review', label: 'Ready for review' },
  { id: 'published', label: 'Published' },
  { id: 'blocked', label: 'Needs attention' },
  { id: 'rejected', label: 'Rejected' },
];
export function RegistryOperations(props: IntelligenceProps) {
  const { query, navigate } = props;
  const [stage, setStage] = useState('');
  const remote = useRegistryData<OperationsReport>(
    'operations',
    { stage, offset: String(query.offset) },
    true,
  );
  if (query.candidate) return <CandidateWorkspace key={query.candidate} {...props} />;
  const data = remote.data;
  return (
    <RegistryState {...remote}>
      {data && (
        <>
          <div className="ri-heading">
            <div>
              <span className="ri-eyebrow">REGISTRY OPERATIONS</span>
              <h2>From discovery to a reviewed asset.</h2>
              <p>
                Candidates, jobs and review revisions stay linked. Publication remains a curator
                decision.
              </p>
            </div>
            <button onClick={remote.reload}>
              <RefreshCw size={15} /> Refresh board
            </button>
          </div>
          {data.readOnly && (
            <p className="ri-notice">
              Read-only snapshot. Connect a persistent registry and run its migration before
              investigation.
            </p>
          )}
          <div className="ri-pipeline" aria-label="Candidate stages">
            {stages.map((s) => (
              <button
                key={s.id}
                aria-pressed={stage === s.id}
                aria-label={`${data.totals[s.id]} ${s.label}`}
                onClick={() => {
                  setStage(stage === s.id ? '' : s.id);
                  navigate({ offset: 0 });
                }}
              >
                <strong>{data.totals[s.id]}</strong>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          {!data.items.length ? (
            <section className="ri-state">
              <h3>No candidates in this view.</h3>
              <p>Import a structured scout issue or use the existing scout intake.</p>
              <RegistryLink query={query} navigate={navigate} changes={{ view: 'scout' }}>
                Open scout intake <ArrowRight size={15} />
              </RegistryLink>
            </section>
          ) : (
            <div className="ri-candidate-list">
              {data.items.map((c) => (
                <article className="ri-candidate" key={c.id}>
                  <div>
                    <span className="ri-tag">{stages.find((s) => s.id === c.stage)?.label}</span>
                    <h3>
                      <RegistryLink
                        query={query}
                        navigate={navigate}
                        changes={{ view: 'operations', candidate: c.id }}
                      >
                        {c.name}
                      </RegistryLink>
                    </h3>
                    <p>{c.note || 'No discovery note was supplied.'}</p>
                    <small>
                      {c.providerId ? `Linked to ${c.providerId}` : 'Provider review required'} ·{' '}
                      {c.pending} pending revisions · {c.live} current published revisions
                    </small>
                  </div>
                  <RegistryLink
                    query={query}
                    navigate={navigate}
                    changes={{ view: 'operations', candidate: c.id }}
                  >
                    Investigate <ArrowRight size={15} />
                  </RegistryLink>
                </article>
              ))}
            </div>
          )}
          <div className="ri-pagination">
            <button
              disabled={!query.offset}
              onClick={() => navigate({ offset: Math.max(0, query.offset - 24) })}
            >
              Previous
            </button>
            <span>{data.total} candidates in this view</span>
            <button
              disabled={data.nextOffset === null}
              onClick={() => navigate({ offset: data.nextOffset ?? 0 })}
            >
              Next
            </button>
          </div>
          <section className="ri-section">
            <h3>Recent indexing runs</h3>
            <p className="ri-muted">
              These are jobs, not candidate counts. Older standalone jobs have no inferred discovery
              provenance.
            </p>
            {data.jobs.slice(0, 8).map((j) => (
              <div className="ri-gap" key={j.id}>
                <span>{j.provider_id}</span>
                <span>
                  {j.status} · attempt {j.attempts}/3
                </span>
              </div>
            ))}
            <RegistryLink query={query} navigate={navigate} changes={{ view: 'jobs' }}>
              All indexing controls <ArrowRight size={14} />
            </RegistryLink>
          </section>
        </>
      )}
    </RegistryState>
  );
}
function CandidateWorkspace({ query, navigate }: IntelligenceProps) {
  const remote = useRegistryData<CandidateDetail>('candidate', { id: query.candidate }, true);
  const providers = useRegistryData<{ items: ProviderRecord[] }>('providers');
  const [providerId, setProviderId] = useState(''),
    [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const data = remote.data,
    c = data?.candidate;
  async function act(action: string, body: unknown) {
    setBusy(true);
    setError('');
    try {
      await registryRequest(action, { authenticated: true, body });
      remote.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <RegistryLink query={query} navigate={navigate} changes={{ view: 'operations' }}>
        <ArrowLeft size={14} /> Operations board
      </RegistryLink>
      <RegistryState {...remote}>
        {data && c && (
          <>
            <div className="ri-heading">
              <div>
                <span className="ri-eyebrow">{c.stage.toUpperCase()}</span>
                <h2>{c.name}</h2>
                <p>{c.note}</p>
              </div>
              <a href={safeAssetUrl(c.url)} target="_blank" rel="noopener noreferrer">
                Original destination <ArrowUpRight size={15} />
              </a>
            </div>
            <p className="ri-muted">
              {c.id} · {c.source} · discovered {new Date(c.createdAt).toLocaleDateString('en-GB')}
            </p>
            {c.postUrl && (
              <a href={safeAssetUrl(c.postUrl)} target="_blank" rel="noopener noreferrer">
                Discovery post <ArrowUpRight size={14} />
              </a>
            )}
            {error && (
              <p className="ri-notice" role="alert">
                {error}
              </p>
            )}
            <div className="ri-two-columns">
              <section className="ri-panel">
                <h3>Curator decision</h3>
                <p className="ri-muted">
                  Link an already approved provider. New sources need a reviewed adapter, not a
                  guessed provider ID.
                </p>
                <label>
                  Approved provider
                  <select
                    value={providerId || c.providerId || ''}
                    onChange={(e) => setProviderId(e.target.value)}
                  >
                    <option value="">Select a provider</option>
                    {providers.data?.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Decision reason
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Record what you checked and why."
                  />
                </label>
                <div className="ri-actions">
                  <button
                    disabled={
                      busy ||
                      !(providerId || c.providerId) ||
                      reason.trim().length < 10 ||
                      c.stage === 'rejected'
                    }
                    onClick={() =>
                      void act('candidate-update', {
                        id: c.id,
                        expectedRevision: c.revision,
                        decision: 'link',
                        providerId: providerId || c.providerId,
                        reason,
                      })
                    }
                  >
                    Link provider
                  </button>
                  <button
                    disabled={busy || reason.trim().length < 10 || c.activeJobs > 0}
                    onClick={() =>
                      void act('candidate-update', {
                        id: c.id,
                        expectedRevision: c.revision,
                        decision: c.stage === 'rejected' ? 'reopen' : 'reject',
                        reason,
                      })
                    }
                  >
                    {c.stage === 'rejected' ? 'Reopen candidate' : 'Reject candidate'}
                  </button>
                </div>
                {c.reason && <p className="ri-muted">Last decision: {c.reason}</p>}
              </section>
              <section className="ri-panel">
                <h3>Bounded investigation</h3>
                <p>
                  Queue one batch from {c.providerId || 'an approved source'}. Indexing stages
                  evidence; it does not publish.
                </p>
                <button
                  className="ri-primary"
                  disabled={busy || !c.providerId || c.stage === 'rejected' || c.activeJobs > 0}
                  onClick={() =>
                    void act('candidate-investigate', { id: c.id, expectedRevision: c.revision })
                  }
                >
                  Queue investigation
                </button>
                <dl className="ri-facts">
                  <div>
                    <dt>Pending review</dt>
                    <dd>{c.pending}</dd>
                  </div>
                  <div>
                    <dt>Approved revisions</dt>
                    <dd>{c.approved}</dd>
                  </div>
                  <div>
                    <dt>Currently published</dt>
                    <dd>{c.live}</dd>
                  </div>
                  <div>
                    <dt>Failed or cancelled jobs</dt>
                    <dd>{c.failedJobs}</dd>
                  </div>
                </dl>
              </section>
            </div>
            <section className="ri-section">
              <h3>Linked jobs</h3>
              {!data.jobs.length && <p>No investigation has been queued for this candidate.</p>}
              {data.jobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  busy={busy}
                  reason={reason}
                  act={act}
                  continueJob={() =>
                    void act('candidate-investigate', {
                      id: c.id,
                      expectedRevision: c.revision,
                      afterJobId: j.id,
                    })
                  }
                />
              ))}
            </section>
            <section className="ri-section">
              <h3>Review the evidence</h3>
              <p className="ri-muted">
                Showing the latest {data.revisions.length} of {data.revisionTotal} linked revisions.
                Inspect the actual revision before approving it.
              </p>
              {data.revisions.map((r) => (
                <article key={r.id} className="ri-review">
                  <h4>
                    {r.name} <span className="ri-tag">{r.status}</span>
                  </h4>
                  <p className="ri-muted">{r.assetId}</p>
                  {r.status === 'pending' ? (
                    <RevisionReview id={r.id} reason={reason} busy={busy} act={act} />
                  ) : (
                    <p>{r.reason}</p>
                  )}
                </article>
              ))}
              {data.revisionTotal > 48 && (
                <RegistryLink query={query} navigate={navigate} changes={{ view: 'review' }}>
                  Open the full review queue
                </RegistryLink>
              )}
            </section>
            <section className="ri-section">
              <h3>Provenance and decisions</h3>
              {data.deliveries.map((d, i) => (
                <p key={i}>
                  <a
                    href={`https://github.com/${d.repository}/issues/${d.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub issue #{d.issueNumber}
                  </a>{' '}
                  · {new Date(d.receivedAt).toLocaleString('en-GB')}
                </p>
              ))}
              {data.history.map((h, i) => (
                <details key={i}>
                  <summary>
                    {h.action} · {h.actor} · {new Date(h.created_at).toLocaleString('en-GB')}
                  </summary>
                  <pre>{h.detail}</pre>
                </details>
              ))}
            </section>
          </>
        )}
      </RegistryState>
    </>
  );
}
function JobRow({
  job: j,
  busy,
  reason,
  act,
  continueJob,
}: {
  job: OperationJob;
  busy: boolean;
  reason: string;
  act: (action: string, body: unknown) => Promise<void>;
  continueJob: () => void;
}) {
  return (
    <article className="ri-job">
      <div>
        <strong>{j.provider_id}</strong>
        <p>
          {j.status} · attempt {j.attempts}/3 · {j.stats.staged ?? 0} staged
        </p>
        <small>{j.id}</small>
        {j.error && <p>{j.error}</p>}
      </div>
      <div className="ri-actions">
        {['queued', 'retry'].includes(j.status) && (
          <button disabled={busy} onClick={() => void act('run', { id: j.id })}>
            Run one batch
          </button>
        )}
        {['queued', 'running', 'retry'].includes(j.status) && (
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => void act('cancel', { id: j.id, reason })}
          >
            Cancel job
          </button>
        )}
        {j.status === 'complete' && Number.isInteger(j.stats.nextOffset) && (
          <button disabled={busy} onClick={continueJob}>
            Queue next batch
          </button>
        )}
      </div>
    </article>
  );
}
function RevisionReview({
  id,
  reason,
  busy,
  act,
}: {
  id: string;
  reason: string;
  busy: boolean;
  act: (action: string, body: unknown) => Promise<void>;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <>
      <button onClick={() => setOpened((v) => !v)} aria-expanded={opened}>
        {opened ? 'Hide revision evidence' : 'Inspect revision evidence'}
      </button>
      {opened && <RevisionEvidence id={id} reason={reason} busy={busy} act={act} />}
    </>
  );
}
function RevisionEvidence({
  id,
  reason,
  busy,
  act,
}: {
  id: string;
  reason: string;
  busy: boolean;
  act: (action: string, body: unknown) => Promise<void>;
}) {
  const remote = useRegistryData<{ asset: AssetRecord; status: string }>('revision', { id }, true);
  const a = remote.data?.asset;
  return (
    <RegistryState {...remote}>
      {a && (
        <div className="ri-panel">
          <p>{a.description}</p>
          <a href={safeAssetUrl(a.sourceUrl)} target="_blank" rel="noopener noreferrer">
            Inspect original source <ArrowUpRight size={14} />
          </a>
          <p>
            {a.licence.expression} · commercial use: {a.licence.commercial} · redistribution:{' '}
            {a.licence.redistribution}
          </p>
          <p>{a.licence.note}</p>
          <details>
            <summary>Retained licence text</summary>
            <pre>{a.licence.text || 'No retained licence text.'}</pre>
          </details>
          {a.variants.map((v) => (
            <p key={v.id}>
              {v.framework} / {v.format} · source pin {v.sourceRef || 'unknown'} · dependencies:{' '}
              {v.dependencies.join(', ') || 'None listed; inspect upstream evidence.'}
            </p>
          ))}
          {a.evidence?.map((e, i) => (
            <p key={i}>
              <a href={safeAssetUrl(e.url)} target="_blank" rel="noopener noreferrer">
                {e.field}
              </a>{' '}
              · {e.method} · {e.observedAt}
            </p>
          ))}
          <p className="ri-muted">
            Use the decision reason above. These buttons decide this exact revision, not the
            provider.
          </p>
          <div className="ri-actions">
            <button
              className="ri-primary"
              disabled={busy || reason.trim().length < 10 || remote.data?.status !== 'pending'}
              onClick={() => void act('review', { id, decision: 'approve', reason })}
            >
              Approve this revision
            </button>
            <button
              disabled={busy || reason.trim().length < 10 || remote.data?.status !== 'pending'}
              onClick={() => void act('review', { id, decision: 'reject', reason })}
            >
              Reject this revision
            </button>
          </div>
        </div>
      )}
    </RegistryState>
  );
}
