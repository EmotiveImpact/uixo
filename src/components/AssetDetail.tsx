import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AssetPreview } from './AssetPreview';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { AssetRecord, Acquisition, AssetQuery } from '../lib/asset-library';

export function AssetDetail({
  id,
  close,
  nameOf,
  saved,
  toggleSave,
  query,
}: {
  id: string;
  close: () => void;
  nameOf: (id: string) => string;
  saved: boolean;
  toggleSave: () => void;
  query: AssetQuery;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [error, setError] = useState('');
  const [variant, setVariant] = useState('');
  const [notice, setNotice] = useState('');
  const [framework, setFramework] = useState(query.framework || 'react');
  const [css, setCss] = useState('tailwind');
  const [compatibility, setCompatibility] = useState<{
    status: string;
    reasons: string[];
    missingDependencies: string[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [resolution, setResolution] = useState<{
    variant: string;
    result?: Acquisition;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    registryRequest<AssetRecord>('asset', { query: { id }, signal: abort.signal })
      .then((value) => {
        if (abort.signal.aborted) return;
        setAsset(value);
        const chosen = value.variants.find(
          (v) =>
            (!query.framework || v.framework === query.framework) &&
            (!query.format || v.format === query.format),
        );
        setVariant(chosen?.id || value.variants[0]?.id || '');
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [id, query.framework, query.format]);
  useEffect(() => {
    if (!variant) return;
    const abort = new AbortController();
    registryRequest<Acquisition>('resolve', {
      body: { id, variantId: variant },
      signal: abort.signal,
    })
      .then((result) => {
        if (!abort.signal.aborted) setResolution({ variant, result });
      })
      .catch((e) => {
        if (!abort.signal.aborted) setResolution({ variant, error: e.message });
      });
    return () => abort.abort();
  }, [id, variant]);
  const selected = asset?.variants.find((v) => v.id === variant);
  const current = resolution?.variant === variant ? resolution : null;
  const result = current?.result;
  const command = result?.command
    ? [result.command.executable, ...result.command.arguments]
        .map((part) =>
          /^[a-zA-Z0-9@/.:_=-]+$/.test(part) ? part : "'" + part.replaceAll("'", "'\\''") + "'",
        )
        .join(' ')
    : '';
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice('Copy is unavailable. Select the text to copy it.');
    }
  }
  async function check() {
    setChecking(true);
    setCompatibility(null);
    try {
      setCompatibility(
        await registryRequest('compatibility', {
          body: { id, variantId: variant, project: { framework, css, packages: {} } },
        }),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Compatibility check failed.');
    } finally {
      setChecking(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="asset-library-dialog"
      aria-labelledby="asset-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <button className="asset-library-close" onClick={close} aria-label="Close asset details">
        <X size={20} />
      </button>
      {error && <p role="alert">{error}</p>}
      {!asset && !error && <p role="status">Loading asset…</p>}
      {asset && (
        <>
          <AssetPreview asset={asset} />
          <div className="asset-library-detail">
            <div className="asset-detail-top">
              <div>
                <p className="asset-eyebrow">{nameOf(asset.providerId)} / Indexed asset</p>
                <h2 id="asset-detail-title">{asset.name}</h2>
              </div>
              <button aria-pressed={saved} onClick={toggleSave}>
                {saved ? 'Saved' : 'Save asset'}
              </button>
            </div>
            <p>{asset.description}</p>
            <div className="asset-detail-columns">
              <div>
                <section>
                  <h3>Make it part of your project</h3>
                  <label className="asset-library-field">
                    Choose a variant
                    <select
                      value={variant}
                      onChange={(e) => {
                        setVariant(e.target.value);
                        setCompatibility(null);
                        setNotice('');
                      }}
                    >
                      {asset.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.framework === 'agnostic' ? 'Framework agnostic' : v.framework} /{' '}
                          {v.format.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="asset-library-acquisition" aria-live="polite">
                    {!current && <p>Finding the source and install instructions…</p>}
                    {current?.error && <p role="alert">{current.error}</p>}
                    {result && (
                      <>
                        <p>{result.message}</p>
                        {command && (
                          <>
                            <pre tabIndex={0}>{command}</pre>
                            <button onClick={() => void copy(command)}>Copy instruction</button>
                          </>
                        )}
                        <p>
                          <a
                            href={safeAssetUrl(result.url) || safeAssetUrl(asset.sourceUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {result.status === 'ready'
                              ? 'Open authorised source ↗'
                              : 'Review original source ↗'}
                          </a>
                        </p>
                      </>
                    )}
                  </div>
                  <p>
                    <strong>Dependencies:</strong>{' '}
                    {selected?.dependencies.join(', ') || 'None declared'}
                  </p>
                  {!!selected?.registryDependencies?.length && (
                    <p>
                      <strong>Registry dependencies:</strong>{' '}
                      {selected.registryDependencies.join(', ')}
                    </p>
                  )}
                  {!!Object.keys(selected?.peerDependencies || {}).length && (
                    <pre>{JSON.stringify(selected?.peerDependencies, null, 2)}</pre>
                  )}
                </section>
                <section>
                  <h3>Check your project</h3>
                  <p>
                    Compare declared requirements. This does not run the component in your project.
                  </p>
                  <div className="asset-compat-fields">
                    <label>
                      Framework
                      <select
                        value={framework}
                        onChange={(e) => {
                          setFramework(e.target.value);
                          setCompatibility(null);
                        }}
                      >
                        {['react', 'vue', 'html', 'agnostic'].map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Styling
                      <select
                        value={css}
                        onChange={(e) => {
                          setCss(e.target.value);
                          setCompatibility(null);
                        }}
                      >
                        <option value="tailwind">Tailwind</option>
                        <option value="css">CSS</option>
                      </select>
                    </label>
                  </div>
                  <button disabled={checking} onClick={() => void check()}>
                    {checking ? 'Checking…' : 'Check compatibility'}
                  </button>
                  {compatibility && (
                    <div role="status">
                      <strong>{compatibility.status.replaceAll('-', ' ')}</strong>
                      {compatibility.reasons.map((reason) => (
                        <p key={reason}>{reason}</p>
                      ))}
                      {!!compatibility.missingDependencies.length && (
                        <p>Dependencies to add: {compatibility.missingDependencies.join(', ')}</p>
                      )}
                    </div>
                  )}
                </section>
              </div>
              <div>
                <section>
                  <h3>Licence & provenance</h3>
                  <dl className="asset-library-facts">
                    {[
                      ['Licence', asset.licence.expression],
                      ['Commercial use', asset.licence.commercial],
                      ['Redistribution', asset.licence.redistribution],
                      [
                        'Source checked',
                        asset.verifiedAt
                          ? new Date(asset.verifiedAt).toLocaleDateString('en-GB')
                          : 'Not verified',
                      ],
                      ['Editorial pick', asset.editorialPick ? 'Yes' : 'No'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>{asset.licence.note}</p>
                  <details>
                    <summary>Read complete licence notices</summary>
                    <pre>{asset.licence.text || 'Read the complete licence at the source.'}</pre>
                    <a
                      href={safeAssetUrl(asset.licence.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Source licence ↗
                    </a>
                  </details>
                </section>
                <section>
                  <h3>Go to the evidence</h3>
                  {asset.evidence?.map((e, i) => (
                    <div className="asset-evidence" key={i}>
                      <a href={safeAssetUrl(e.url)} target="_blank" rel="noopener noreferrer">
                        {e.field} ↗
                      </a>
                      <p>
                        {e.method} · {new Date(e.observedAt).toLocaleDateString('en-GB')} ·{' '}
                        {e.reference?.slice(0, 12) || 'Mutable source reference'}
                      </p>
                    </div>
                  ))}
                  <a href={safeAssetUrl(asset.sourceUrl)} target="_blank" rel="noopener noreferrer">
                    Original GitHub source ↗
                  </a>
                  <p>
                    <button onClick={() => void copy(window.location.href)}>Copy asset link</button>
                  </p>
                </section>
              </div>
            </div>
            <p role="status">{notice}</p>
          </div>
        </>
      )}
    </dialog>
  );
}
