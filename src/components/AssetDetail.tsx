import { ArrowUpRight, Bookmark, Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AssetPreview } from './AssetPreview';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { Acquisition, AssetQuery, AssetRecord } from '../lib/asset-library';

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
    void registryRequest<AssetRecord>('asset', { query: { id }, signal: abort.signal })
      .then((value) => {
        if (abort.signal.aborted) return;
        setAsset(value);
        const chosen = value.variants.find(
          (item) =>
            (!query.framework || item.framework === query.framework) &&
            (!query.format || item.format === query.format),
        );
        setVariant(chosen?.id || value.variants[0]?.id || '');
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Unable to load this asset.');
      });
    return () => abort.abort();
  }, [id, query.framework, query.format]);

  useEffect(() => {
    if (!variant) return;
    const abort = new AbortController();
    void registryRequest<Acquisition>('resolve', {
      body: { id, variantId: variant },
      signal: abort.signal,
    })
      .then((result) => {
        if (!abort.signal.aborted) setResolution({ variant, result });
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setResolution({
            variant,
            error: cause instanceof Error ? cause.message : 'Unable to resolve this asset.',
          });
      });
    return () => abort.abort();
  }, [id, variant]);

  const selected = asset?.variants.find((item) => item.id === variant);
  const current = resolution?.variant === variant ? resolution : null;
  const result = current?.result;
  const sourceUrl = safeAssetUrl(result?.url) || safeAssetUrl(asset?.sourceUrl);
  const command = result?.command
    ? [result.command.executable, ...result.command.arguments]
        .map((part) =>
          /^[a-zA-Z0-9@/.:_=-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`,
        )
        .join(' ')
    : '';

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied to clipboard.');
    } catch {
      setNotice('Copy is unavailable. Select the instruction to copy it.');
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
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Compatibility check failed.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="asset-library-dialog asset-detail-drawer"
      aria-labelledby="asset-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <button className="asset-library-close" onClick={close} aria-label="Close asset details">
        <X size={18} />
      </button>
      {error && (
        <p className="asset-detail-message" role="alert">
          {error}
        </p>
      )}
      {!asset && !error && (
        <p className="asset-detail-message" role="status">
          Loading asset…
        </p>
      )}
      {asset && (
        <div className="asset-detail-scroll">
          <AssetPreview asset={asset} detail />
          <div className="asset-library-detail">
            <p className="asset-eyebrow">
              {nameOf(asset.providerId)} / {asset.kind === 'icon-pack' ? 'Icon pack' : asset.kind}
            </p>
            <h2 id="asset-detail-title">{asset.name}</h2>
            <p className="asset-detail-description">{asset.description}</p>

            <div className="asset-detail-primary-actions">
              {command ? (
                <button className="asset-library-primary" onClick={() => void copy(command)}>
                  <Copy size={14} />
                  Copy install command
                </button>
              ) : sourceUrl ? (
                <a
                  className="asset-library-primary"
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {asset.kind === 'icon-pack' ? 'Browse icon pack' : 'Open original source'}
                  <ArrowUpRight size={14} />
                </a>
              ) : null}
              {command && sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                  View source
                  <ArrowUpRight size={14} />
                </a>
              )}
              <button aria-pressed={saved} onClick={toggleSave}>
                {saved ? <Check size={14} /> : <Bookmark size={14} />}
                {saved ? 'Saved' : 'Save asset'}
              </button>
            </div>

            <dl className="asset-library-facts asset-drawer-facts">
              <div>
                <dt>Framework</dt>
                <dd>{selected?.framework ?? '—'}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{selected?.format.toUpperCase() ?? '—'}</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>{asset.licence.expression}</dd>
              </div>
              <div>
                <dt>Commercial</dt>
                <dd>{asset.licence.commercial}</dd>
              </div>
              <div>
                <dt>Redistribution</dt>
                <dd>{asset.licence.redistribution}</dd>
              </div>
              <div>
                <dt>Source check</dt>
                <dd>
                  {asset.verifiedAt
                    ? new Date(asset.verifiedAt).toLocaleDateString('en-GB')
                    : 'Not verified'}
                </dd>
              </div>
              <div>
                <dt>Editorial pick</dt>
                <dd>{asset.editorialPick ? 'Yes' : 'No'}</dd>
              </div>
            </dl>

            <label className="asset-library-field asset-variant-field">
              Choose a variant
              <select
                value={variant}
                onChange={(event) => {
                  setVariant(event.target.value);
                  setCompatibility(null);
                  setNotice('');
                }}
              >
                {asset.variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.framework === 'agnostic' ? 'Framework agnostic' : item.framework} /{' '}
                    {item.format.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <details className="asset-drawer-section" open>
              <summary>Installation</summary>
              {!current && <p>Finding the source and installation guidance…</p>}
              {current?.error && <p role="alert">{current.error}</p>}
              {result?.message && <p>{result.message}</p>}
              {command && (
                <div className="asset-command">
                  <pre tabIndex={0}>{command}</pre>
                  <button
                    onClick={() => void copy(command)}
                    aria-label="Copy installation instruction"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
              <p>
                <strong>Dependencies:</strong>{' '}
                {selected?.dependencies.join(', ') || 'None declared'}
              </p>
            </details>

            <details className="asset-drawer-section">
              <summary>Project fit</summary>
              <div className="asset-compat-fields">
                <label>
                  Framework
                  <select value={framework} onChange={(event) => setFramework(event.target.value)}>
                    {['react', 'vue', 'html', 'agnostic'].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Styling
                  <select value={css} onChange={(event) => setCss(event.target.value)}>
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
            </details>

            <details className="asset-drawer-section">
              <summary>Licence &amp; provenance</summary>
              <p>{asset.licence.note}</p>
              {asset.evidence?.map((item, index) => (
                <div className="asset-evidence" key={`${item.field}-${index}`}>
                  <a href={safeAssetUrl(item.url)} target="_blank" rel="noopener noreferrer">
                    {item.field} ↗
                  </a>
                  <p>
                    {item.method} · {new Date(item.observedAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
              ))}
              <button onClick={() => void copy(window.location.href)}>Copy asset link</button>
            </details>
            <p className="asset-drawer-notice" role="status">
              {notice}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
