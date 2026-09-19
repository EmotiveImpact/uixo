import { useEffect, useState } from 'react';
import { auth } from '../lib/auth';
import { assetHref, EMPTY_ASSET_QUERY, registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { AssetQuery, AssetRecord, ProviderRecord } from '../lib/asset-library';
type Row = {
  id: string;
  asset?: AssetRecord;
  status?: string;
  name?: string;
  url?: string;
  note?: string;
  provider_id?: string;
  providerId?: string;
  attempts?: number;
  error?: string;
  stats?: { nextOffset?: number };
};

export function AssetUtilities({ view }: { view: AssetQuery['view'] }) {
  const [notice, setNotice] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [input, setInput] = useState('');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const operator = ['review', 'scout', 'jobs'].includes(view);
  async function operation<T>(action: string, body?: unknown): Promise<T> {
    const token = await auth.apiToken();
    const response = await fetch('/api/registry?action=' + action, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: {
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data.error)
      throw new Error(data.error?.message || 'This operation is unavailable.');
    return data;
  }
  useEffect(() => {
    if (!operator) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotice('');
      try {
        const [result, sources] = await Promise.all([
          operation<{ items: Row[] }>(view === 'review' ? 'queue' : view),
          registryRequest<{ items: ProviderRecord[] }>('providers'),
        ]);
        if (!cancelled) {
          setRows(result.items);
          setProviders(sources.items);
        }
      } catch (e) {
        if (!cancelled) setNotice(e instanceof Error ? e.message : 'Unable to load workspace.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, operator, refresh]);
  async function act(action: string, body: unknown) {
    setBusy(true);
    setNotice('');
    try {
      await operation(action, body);
      setSelected(null);
      setRefresh((x) => x + 1);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice('Select and copy the text below.');
    }
  }
  if (view === 'guide')
    return (
      <section className="asset-utility">
        <h2>Find it. Understand it. Make it yours.</h2>
        <ol>
          <li>
            Search for a component or icon, then narrow by source, framework, format and price.
          </li>
          <li>Open an asset to see its variants, dependencies, licence and source evidence.</li>
          <li>
            Choose a variant to get its source or install instruction. Check compatibility with your
            project.
          </li>
          <li>
            Save useful assets and share the URL. Guest saves stay in this browser. Sign in to
            synchronise assets across devices.
          </li>
        </ol>
        <p>
          Icon previews show the original SVG. Component demos run the original source in an
          isolated preview: click, type and interact with them before choosing an asset.
        </p>
        <a href={assetHref(EMPTY_ASSET_QUERY)}>Browse assets ↗</a>
      </section>
    );
  if (view === 'connect')
    return (
      <section className="asset-utility">
        <div className="asset-detail-columns">
          <section>
            <h2>Bring UIXO into your workflow.</h2>
            <p>
              Your agent can search the same catalogue and inspect its source, licence and
              installation guidance.
            </p>
            <label>Remote MCP endpoint</label>
            <pre>{window.location.origin}/api/mcp</pre>
            <button onClick={() => void copy(window.location.origin + '/api/mcp')}>
              Copy endpoint
            </button>
            <h3>Local connection</h3>
            <p>From the UIXO repository with dependencies installed:</p>
            <pre>npm run registry:mcp</pre>
            <p>
              Protected Vercel previews require deployment access. Use an accessible deployment
              endpoint for your coding client. Acquisition tools return instructions; they do not
              install code.
            </p>
          </section>
          <section>
            <h2>Tools for your agent</h2>
            {[
              ['search_assets', 'Find assets by intent, framework and licence.'],
              ['inspect_asset', 'Read variants, dependencies and provenance.'],
              ['get_preview', 'Get available source previews.'],
              ['check_compatibility', 'Compare declared project requirements.'],
              ['resolve_asset', 'Find an authorised source.'],
              ['acquire_asset', 'Get installation guidance for your approval.'],
              ['get_source_health', 'Inspect stored source evidence and coverage.'],
              ['list_asset_collections', 'Find published editorial selections.'],
              ['inspect_asset_collection', 'Read a typed selection and its curator notes.'],
            ].map(([name, description]) => (
              <div className="asset-evidence" key={name}>
                <code>{name}</code>
                <p>{description}</p>
              </div>
            ))}
          </section>
        </div>
        <p role="status">{notice}</p>
      </section>
    );
  return (
    <section className="asset-utility">
      <nav className="asset-utility-nav">
        {['review', 'scout', 'jobs'].map((entry) => (
          <a
            key={entry}
            aria-current={view === entry ? 'page' : undefined}
            href={assetHref({ ...EMPTY_ASSET_QUERY, view: entry as AssetQuery['view'] })}
          >
            {entry === 'review'
              ? 'Review queue'
              : entry === 'scout'
                ? 'Scout intake'
                : 'Indexing runs'}
          </a>
        ))}
      </nav>
      <p>Curator access is checked by the server. Indexing stages revisions for review.</p>
      {loading && <p role="status">Loading workspace…</p>}
      {notice && <p role="alert">{notice}</p>}
      {view === 'scout' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              void act('scout', JSON.parse(input));
            } catch {
              setNotice('Enter valid JSON with an items array.');
            }
          }}
        >
          <label>
            Import discoveries
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void file.text().then(setInput);
              }}
            />
          </label>
          <label>
            Scout JSON
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={7}
              placeholder='{"items":[{"name":"Example","url":"https://example.com","note":"Why it is useful"}]}'
            />
          </label>
          <button disabled={busy}>Stage discoveries</button>
        </form>
      )}
      {view === 'jobs' && (
        <div className="asset-library-actions">
          {providers.map((p) => (
            <button
              disabled={busy}
              key={p.id}
              onClick={() => void act('enqueue', { providerId: p.id })}
            >
              Queue {p.name}
            </button>
          ))}
        </div>
      )}
      {!loading && !notice && !rows.length && (
        <p>
          No{' '}
          {view === 'review'
            ? 'pending revisions'
            : view === 'scout'
              ? 'discoveries'
              : 'indexing runs'}{' '}
          yet.
        </p>
      )}
      {rows.map((row) => (
        <article className="asset-operator-row" key={row.id}>
          <h3>{row.asset?.name || row.name || row.providerId || row.provider_id || row.id}</h3>
          <p>{row.asset?.description || row.note || row.status}</p>
          {row.url && (
            <a href={safeAssetUrl(row.url)} target="_blank" rel="noopener noreferrer">
              Source ↗
            </a>
          )}
          {row.error && <p>{row.error}</p>}
          {view === 'review' && (
            <>
              <details>
                <summary>Inspect revision and evidence</summary>
                <pre>{JSON.stringify(row.asset, null, 2)}</pre>
              </details>
              <button
                onClick={() => {
                  setSelected(row);
                  setReason('');
                }}
              >
                Review revision
              </button>
            </>
          )}
          {view === 'jobs' && (
            <>
              <p>Attempts: {row.attempts || 0}/3</p>
              {['queued', 'retry', 'running'].includes(row.status || '') && (
                <button disabled={busy} onClick={() => void act('run', { id: row.id })}>
                  Run now
                </button>
              )}
              {row.status === 'complete' && Number.isInteger(row.stats?.nextOffset) && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void act('enqueue', {
                      providerId: row.providerId || row.provider_id,
                      afterJobId: row.id,
                    })
                  }
                >
                  Index next batch
                </button>
              )}
            </>
          )}
        </article>
      ))}
      {selected && (
        <section>
          <h3>Review {selected.asset?.name}</h3>
          <label>
            Reason
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => void act('review', { id: selected.id, decision: 'approve', reason })}
          >
            Approve publication
          </button>
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => void act('review', { id: selected.id, decision: 'reject', reason })}
          >
            Reject revision
          </button>
          <button onClick={() => setSelected(null)}>Cancel</button>
        </section>
      )}
    </section>
  );
}
