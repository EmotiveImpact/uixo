import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Copy, X } from 'lucide-react';
import {
  ASSET_SAVES, EMPTY_ASSET_QUERY, assetHref, catalogueResult, parseSavedAssets,
  registryRequest, safeAssetUrl,
} from '../lib/asset-library';
import type { Acquisition, AssetQuery, AssetRecord, Catalogue, ProviderRecord, RegistryStatus } from '../lib/asset-library';

type Props = { query: AssetQuery; navigate: (changes: Partial<AssetQuery>, reset?: boolean) => void; density: string };
const formatDate = (value: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Not verified';
function Preview({ asset }: { asset: AssetRecord }) {
  const [failed, setFailed] = useState(false);
  const url = safeAssetUrl(asset.preview?.url);
  const original = asset.preview?.kind === 'image' && url && new URL(url).hostname === 'raw.githubusercontent.com';
  return <div className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''}`}>
    {original && !failed ? <img src={url} loading="lazy" alt={`${asset.name} source preview`} onError={() => setFailed(true)} /> : <div className="asset-library-no-preview"><span aria-hidden="true">{asset.kind === 'icon' ? '◇' : '</>'}</span><strong>{asset.name}</strong></div>}
    <small>{original && !failed ? 'Original source preview' : 'Source preview not captured'}</small>
  </div>;
}
function AssetDetail({ id, close, nameOf }: { id: string; close: () => void; nameOf: (id: string) => string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Acquisition | null>(null);
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  useEffect(() => {
    const abort = new AbortController();
    void registryRequest<AssetRecord>('asset', { query: { id }, signal: abort.signal }).then((value) => {
      if (!value || value.id !== id || !Array.isArray(value.variants) || !value.licence) throw new Error('Invalid asset detail response.');
      if (!abort.signal.aborted) { setAsset(value); setVariant(value.variants[0]?.id ?? ''); }
    }).catch((e: unknown) => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Asset details are unavailable.'); });
    return () => abort.abort();
  }, [id]);
  async function resolve() {
    setBusy(true); setNotice(''); setResult(null);
    try { setResult(await registryRequest<Acquisition>('resolve', { body: { id, variantId: variant } })); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not resolve this asset.'); }
    finally { setBusy(false); }
  }
  const selected = asset?.variants.find((v) => v.id === variant);
  const command = result?.command ? [result.command.executable, ...result.command.arguments.map((arg) => `'${arg.replace(/'/g, `'"'"'`)}'`)].join(' ') : '';
  return <dialog ref={ref} className="asset-library-dialog" aria-labelledby="asset-library-detail-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="asset-library-detail"><button className="asset-library-close" onClick={close} aria-label="Close asset details"><X size={20} /></button>
      <h2 id="asset-library-detail-title">{asset?.name ?? 'Asset details'}</h2>
      {error && <p role="alert">{error}</p>}{!asset && !error && <p role="status">Loading source details…</p>}
      {asset && <><p className="asset-library-muted">{nameOf(asset.providerId)} · Indexed asset, not an individual editorial pick</p><Preview asset={asset} /><p>{asset.description}</p>
        <dl className="asset-library-facts"><div><dt>Licence</dt><dd>{asset.licence.expression}</dd></div><div><dt>Commercial use</dt><dd>{asset.licence.commercial}</dd></div><div><dt>Source check</dt><dd>{formatDate(asset.verifiedAt)}</dd></div></dl>
        <label className="asset-library-field">Format / framework<select value={variant} onChange={(event) => { setVariant(event.target.value); setResult(null); setNotice(''); }}>{asset.variants.map((v) => <option key={v.id} value={v.id}>{v.framework} · {v.format.toUpperCase()}</option>)}</select></label>
        <p><strong>Dependencies: </strong>{selected?.dependencies.join(', ') || 'None declared. This is not a compatibility guarantee.'}</p>
        <p className="asset-library-muted">{asset.licence.note}</p>
        <div className="asset-library-actions"><button className="asset-library-primary" onClick={() => void resolve()} disabled={busy || !variant}>{busy ? 'Checking acquisition…' : 'Get asset / install instructions'}</button><a href={safeAssetUrl(asset.sourceUrl)} target="_blank" rel="noopener noreferrer">Original source <ArrowUpRight size={15} /></a></div>
        {result && <section className="asset-library-acquisition" aria-label="Acquisition result"><strong>{result.status === 'ready' ? 'Review before using' : result.status === 'blocked' ? 'Acquisition requires review' : 'Continue at the provider'}</strong><p>{result.message}</p>{command && <><pre tabIndex={0}>{command}</pre><button onClick={() => { void (async () => { try { await navigator.clipboard.writeText(command); setNotice('Instruction copied. Nothing has been executed.'); } catch { setNotice('Select and copy the instruction above. Clipboard access was unavailable.'); } })(); }}><Copy size={14} /> Copy instruction</button></>}{safeAssetUrl(result.url) && <a href={safeAssetUrl(result.url)} target="_blank" rel="noopener noreferrer">{result.status === 'blocked' ? 'Review original source' : 'Open authorised source'} <ArrowUpRight size={14} /></a>}<p className="asset-library-muted">UIXO does not install or execute code in your project.</p></section>}
        <p role="status">{notice}</p><details><summary>Licence evidence</summary><p><a href={safeAssetUrl(asset.licence.sourceUrl)} target="_blank" rel="noopener noreferrer">View the source licence</a></p><pre>{asset.licence.text || 'Read the complete licence at the original source.'}</pre></details>
      </>}
    </div>
  </dialog>;
}
export function AssetLibrary({ query, navigate, density }: Props) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [status, setStatus] = useState<RegistryStatus | null>(null);
  const [result, setResult] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState<string[]>(() => { try { return parseSavedAssets(localStorage.getItem(ASSET_SAVES)); } catch { return []; } });
  const { q, kind, provider, framework, format, commercial, price, offset, view } = query;
  useEffect(() => {
    const abort = new AbortController();
    void registryRequest<{ items: ProviderRecord[] }>('providers', { signal: abort.signal }).then((value) => { if (Array.isArray(value.items)) setProviders(value.items); }).catch(() => {});
    void registryRequest<RegistryStatus>('status', { signal: abort.signal }).then((value) => { if (value.stats && typeof value.readOnly === 'boolean') setStatus(value); }).catch(() => {});
    return () => abort.abort();
  }, [retry]);
  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      if (view === 'saved' && saved.length === 0) { setResult({ items: [], total: 0, nextOffset: null }); setLoading(false); return; }
      const parameters: Record<string, string> = { q, kind, provider, framework, format, commercial: String(commercial), price, offset: String(offset), limit: '24' };
      if (view === 'saved') parameters.saved = saved.join(',');
      void registryRequest<unknown>('search', { query: parameters, signal: abort.signal }).then(catalogueResult).then((value) => { if (!abort.signal.aborted) setResult(value); }).catch((e: unknown) => { if (!abort.signal.aborted) { setResult(null); setError(e instanceof Error ? e.message : 'The registry API is unavailable.'); } }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }, 180);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [q, kind, provider, framework, format, commercial, price, offset, view, saved, retry]);
  const nameOf = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  function toggleSave(id: string) {
    if (!saved.includes(id) && saved.length >= 200) { setNotice('This browser list holds 200 assets. Remove one before saving another.'); return; }
    const next = saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id]; setSaved(next);
    try { localStorage.setItem(ASSET_SAVES, JSON.stringify(next)); setNotice('Saved assets are stored in this browser, not synced to your account.'); }
    catch { setNotice('Browser storage is unavailable. Your changes will last for this tab only.'); }
    if (view === 'saved') navigate({ offset: 0 });
  }
  const filter = (key: keyof AssetQuery, value: string | boolean) => navigate({ [key]: value, offset: 0, id: '' });
  return <section className="asset-library" aria-label="Asset library">
    <div className="asset-library-toolbar"><nav aria-label="Asset views">{(['assets', 'sources', 'saved'] as const).map((entry) => <a key={entry} href={assetHref({ ...EMPTY_ASSET_QUERY, view: entry })} className={view === entry ? 'selected' : ''} aria-current={view === entry ? 'page' : undefined} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate({ view: entry }, true); }}>{entry === 'assets' ? 'All assets' : entry === 'sources' ? 'Indexed sources' : `Saved (${saved.length})`}</a>)}</nav><a href="/registry/?view=connect">Connect your AI agent <ArrowUpRight size={14} /></a><a href="/registry/guide.html">How to use UIXO</a></div>
    <p className="asset-library-status">{status ? status.readOnly ? 'Read-only evaluation catalogue. Browsing works; publishing and indexing need a persistent database.' : 'Connected to the persistent registry.' : 'Checking registry connection…'} {status && <span>{status.stats.assets} published assets · {status.stats.providers} indexed sources</span>}</p>
    {view === 'sources' ? <div className="asset-library-source-grid">{providers.map((p) => <article key={p.id}><small>Indexed source</small><h2>{p.name}</h2><p>{p.rationale}</p><button onClick={() => navigate({ provider: p.id }, true)}>Browse {p.assetCount} assets <ArrowRight size={15} /></button><a href={safeAssetUrl(p.url)} target="_blank" rel="noopener noreferrer">Original website <ArrowUpRight size={14} /></a></article>)}{!providers.length && <p role="status">{error || 'No source records are available yet.'}</p>}</div> : <>
      <div className="asset-library-filters"><label>Type<select value={kind} onChange={(e) => filter('kind', e.target.value)}><option value="">All asset types</option><option value="component">Components</option><option value="icon">Icons</option><option value="font">Fonts</option><option value="template">Templates</option></select></label><label>Source<select value={provider} onChange={(e) => filter('provider', e.target.value)}><option value="">Every source</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Framework<select value={framework} onChange={(e) => filter('framework', e.target.value)}><option value="">Any framework</option><option value="react">React</option><option value="vue">Vue</option><option value="agnostic">Framework agnostic</option></select></label><label>Format<select value={format} onChange={(e) => filter('format', e.target.value)}><option value="">Any format</option>{['svg', 'tsx', 'jsx', 'css', 'woff2'].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select></label><label className="asset-library-checkbox"><input type="checkbox" checked={commercial} onChange={(e) => filter('commercial', e.target.checked)} /> Commercial-use evidence</label><button onClick={() => navigate({ view }, true)}>Reset filters</button></div>
      <div className="asset-library-result-count" role="status" aria-live="polite">{loading ? 'Searching the registry…' : error ? 'Registry unavailable, not an empty result' : `${result?.total ?? 0} assets found`}<span>Keyword search · Source-level curation</span></div>
      {error ? <section className="asset-library-empty" role="alert"><h2>We could not load the assets.</h2><p>{error}</p><p>The website can load even when its registry API has not started correctly.</p><button onClick={() => setRetry((value) => value + 1)}>Try again</button><a href="/api/registry?action=status" target="_blank" rel="noopener noreferrer">Check registry status <ArrowUpRight size={14} /></a></section> : loading ? <div className="asset-library-grid" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div className="asset-library-skeleton" key={index} />)}</div> : !result?.items.length ? <section className="asset-library-empty"><h2>{view === 'saved' ? 'No saved assets match this view.' : 'No published assets match these filters.'}</h2><p>Website listings and individual assets are different catalogues. Fonts and templates are not populated in the initial source snapshot.</p><button onClick={() => navigate({}, true)}>Show all indexed assets</button><a href="/browse">Browse the full website directory</a></section> : <div className={`asset-library-grid asset-density-${density}`}>{result.items.map((asset) => <article className="asset-library-card" key={asset.id}><a href={assetHref({ ...query, id: asset.id })} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate({ id: asset.id }); }} aria-label={`Inspect ${asset.name} from ${nameOf(asset.providerId)}`}><Preview asset={asset} /><div className="asset-library-card-body"><small>{nameOf(asset.providerId)} · {asset.kind}</small><h2>{asset.name}</h2><p>{asset.description}</p><div className="asset-library-tags"><span>{asset.variants[0]?.framework}</span><span>{asset.variants[0]?.format.toUpperCase()}</span><span>{asset.licence.expression}</span></div></div></a><button className="asset-library-save" aria-label={saved.includes(asset.id) ? `Unsave ${asset.name}` : `Save ${asset.name}`} aria-pressed={saved.includes(asset.id)} onClick={() => toggleSave(asset.id)}><Bookmark size={16} fill={saved.includes(asset.id) ? 'currentColor' : 'none'} /></button></article>)}</div>}
      {!loading && !error && result && (offset > 0 || result.nextOffset !== null) && <nav className="asset-library-pagination" aria-label="Asset pages"><button disabled={offset === 0} onClick={() => navigate({ offset: Math.max(0, offset - 24) })}><ArrowLeft size={14} /> Previous</button><span>Page {Math.floor(offset / 24) + 1}</span><button disabled={result.nextOffset === null} onClick={() => navigate({ offset: result.nextOffset ?? 0 })}>Next <ArrowRight size={14} /></button></nav>}
    </>}
    <p className="asset-library-muted" role="status">{notice}</p>
    {query.id && <AssetDetail key={query.id} id={query.id} nameOf={nameOf} close={() => navigate({ id: '' })} />}
  </section>;
}
