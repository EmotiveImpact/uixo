import { COMPONENT_CATEGORIES } from '../../shared/component-categories';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, SlidersHorizontal, X } from 'lucide-react';
import {
  EMPTY_ASSET_QUERY,
  assetHref,
  catalogueResult,
  registryRequest,
  safeAssetUrl,
} from '../lib/asset-library';
import { AssetDetail } from './AssetDetail';
import { AssetPreview } from './AssetPreview';
import type { AssetQuery, Catalogue, ProviderRecord, RegistryStatus } from '../lib/asset-library';

type Props = {
  query: AssetQuery;
  navigate: (changes: Partial<AssetQuery>, reset?: boolean) => void;
  density: string;
  discovery?: ReactNode;
  assetSaves: {
    saved: string[];
    save: (assetIds: string[]) => boolean;
    accountBacked: boolean;
  };
};

const ASSET_PAGE_SIZE = 24;

function paginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter((page) => page > 0 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  visible.forEach((page, index) => {
    if (index > 0 && page - visible[index - 1] > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
}

export function AssetLibrary({ query, navigate, density, discovery, assetSaves }: Props) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [status, setStatus] = useState<RegistryStatus | null>(null);
  const [result, setResult] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const [refineOpen, setRefineOpen] = useState(false);
  const { saved, save, accountBacked } = assetSaves;
  const { q, kind, category, provider, framework, format, commercial, price, offset, view } = query;
  useEffect(() => {
    const abort = new AbortController();
    void registryRequest<{ items: ProviderRecord[] }>('providers', { signal: abort.signal })
      .then((value) => {
        if (Array.isArray(value.items)) setProviders(value.items);
      })
      .catch(() => {});
    void registryRequest<RegistryStatus>('status', { signal: abort.signal })
      .then((value) => {
        if (value.stats && typeof value.readOnly === 'boolean') setStatus(value);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [retry]);
  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      if (view === 'saved' && saved.length === 0) {
        setResult({ items: [], total: 0, nextOffset: null });
        setLoading(false);
        return;
      }
      const parameters: Record<string, string> = {
        q,
        kind,
        category,
        provider,
        framework,
        format,
        commercial: String(commercial),
        price,
        offset: String(offset),
        limit: String(ASSET_PAGE_SIZE),
      };
      if (view === 'saved') parameters.saved = saved.join(',');
      void registryRequest<unknown>('search', { query: parameters, signal: abort.signal })
        .then(catalogueResult)
        .then((value) => {
          if (!abort.signal.aborted) setResult(value);
        })
        .catch((e: unknown) => {
          if (!abort.signal.aborted) {
            setResult(null);
            setError(e instanceof Error ? e.message : 'The registry API is unavailable.');
          }
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [
    q,
    kind,
    category,
    provider,
    framework,
    format,
    commercial,
    price,
    offset,
    view,
    saved,
    retry,
  ]);
  const nameOf = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  function toggleSave(id: string) {
    if (!saved.includes(id) && saved.length >= 200) {
      setNotice('This browser list holds 200 assets. Remove one before saving another.');
      return;
    }
    const next = saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id];
    const persisted = save(next);
    setNotice(
      persisted
        ? accountBacked
          ? 'Saved in this browser and syncing to your account.'
          : 'Saved in this browser. Sign in to use it on another device.'
        : 'Browser storage is unavailable. Your changes will last for this tab only.',
    );
    if (view === 'saved') navigate({ offset: 0 });
  }
  const filter = (key: keyof AssetQuery, value: string | boolean) =>
    navigate({ [key]: value, ...(key === 'kind' ? { category: '' } : {}), offset: 0, id: '' });
  const refinementCount = [kind, category, provider, framework, format, commercial].filter(
    Boolean,
  ).length;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / ASSET_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.floor(offset / ASSET_PAGE_SIZE) + 1);
  const firstResult = result?.items.length ? offset + 1 : 0;
  const lastResult = result ? Math.min(offset + result.items.length, result.total) : 0;
  const changePage = (page: number) => {
    navigate({ offset: (page - 1) * ASSET_PAGE_SIZE });
    window.requestAnimationFrame(() => {
      document.querySelector('.asset-library-result-count')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };
  return (
    <section className="asset-library" aria-label="Asset library">
      {discovery}
      <div className="asset-library-toolbar">
        <nav aria-label="Asset views">
          {(['assets', 'sources', 'saved'] as const).map((entry) => (
            <a
              key={entry}
              href={assetHref({ ...EMPTY_ASSET_QUERY, view: entry })}
              className={view === entry ? 'selected' : ''}
              aria-current={view === entry ? 'page' : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigate({ view: entry }, true);
              }}
            >
              {entry === 'assets'
                ? 'All assets'
                : entry === 'sources'
                  ? 'Indexed sources'
                  : `Saved (${saved.length})`}
            </a>
          ))}
        </nav>
        {view !== 'sources' && (
          <button
            className="asset-refine"
            aria-expanded={refineOpen}
            aria-controls="asset-refinements"
            onClick={() => setRefineOpen((current) => !current)}
          >
            {refineOpen ? <X size={14} /> : <SlidersHorizontal size={14} />}
            Refine{refinementCount ? ` · ${refinementCount}` : ''}
          </button>
        )}
      </div>
      <p className="asset-library-status">
        {status
          ? status.readOnly
            ? 'Read-only evaluation catalogue. Browsing works; publishing and indexing need a persistent database.'
            : 'Connected to the persistent registry.'
          : 'Checking registry connection…'}{' '}
        {status && (
          <span>
            {status.stats.assets} published assets · {status.stats.providers} indexed sources
          </span>
        )}
      </p>
      {view === 'sources' ? (
        <div className="asset-library-source-grid">
          {providers.map((p) => (
            <article key={p.id}>
              <small>Indexed source</small>
              <h2>{p.name}</h2>
              <p>{p.rationale}</p>
              <button onClick={() => navigate({ provider: p.id }, true)}>
                Browse {p.assetCount} assets <ArrowRight size={15} />
              </button>
              <a href={safeAssetUrl(p.url)} target="_blank" rel="noopener noreferrer">
                Original website <ArrowUpRight size={14} />
              </a>
            </article>
          ))}
          {!providers.length && (
            <p role="status">{error || 'No source records are available yet.'}</p>
          )}
        </div>
      ) : (
        <>
          {refineOpen && (
            <div className="asset-library-filters" id="asset-refinements">
              <label>
                Type
                <select value={kind} onChange={(e) => filter('kind', e.target.value)}>
                  <option value="">All asset types</option>
                  <option value="component">Components</option>
                  <option value="icon-pack">Icon packs</option>
                  <option value="font">Fonts</option>
                  <option value="template">Templates</option>
                </select>
              </label>
              {kind === 'component' && (
                <label>
                  Component category
                  <select value={category} onChange={(e) => filter('category', e.target.value)}>
                    <option value="">All components</option>
                    {COMPONENT_CATEGORIES.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Source
                <select value={provider} onChange={(e) => filter('provider', e.target.value)}>
                  <option value="">Every source</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Framework
                <select value={framework} onChange={(e) => filter('framework', e.target.value)}>
                  <option value="">Any framework</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="agnostic">Framework agnostic</option>
                </select>
              </label>
              <label>
                Format
                <select value={format} onChange={(e) => filter('format', e.target.value)}>
                  <option value="">Any format</option>
                  {['svg', 'tsx', 'jsx', 'css', 'woff2'].map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="asset-library-checkbox">
                <input
                  type="checkbox"
                  checked={commercial}
                  onChange={(e) => filter('commercial', e.target.checked)}
                />{' '}
                Commercial-use evidence
              </label>
              <button onClick={() => navigate({ view }, true)}>Reset filters</button>
            </div>
          )}
          <div className="asset-library-result-count" role="status" aria-live="polite">
            {loading
              ? 'Searching the registry…'
              : error
                ? 'Registry unavailable, not an empty result'
                : `${result?.total ?? 0} ${result?.total === 1 ? 'asset' : 'assets'} found`}
            <span>Keyword search · Source-level curation</span>
          </div>
          {error ? (
            <section className="asset-library-empty" role="alert">
              <h2>We could not load the assets.</h2>
              <p>{error}</p>
              <p>The website can load even when its registry API has not started correctly.</p>
              <button onClick={() => setRetry((value) => value + 1)}>Try again</button>
              <a href="/api/registry?action=status" target="_blank" rel="noopener noreferrer">
                Check registry status <ArrowUpRight size={14} />
              </a>
            </section>
          ) : loading ? (
            <div className="asset-library-grid" aria-busy="true">
              {Array.from({ length: 8 }, (_, index) => (
                <div className="asset-library-skeleton" key={index} />
              ))}
            </div>
          ) : !result?.items.length ? (
            <section className="asset-library-empty">
              <h2>
                {view === 'saved'
                  ? 'No saved assets match this view.'
                  : 'No published assets match these filters.'}
              </h2>
              <p>
                Website listings and individual assets are different catalogues. Fonts and templates
                are not populated in the initial source snapshot.
              </p>
              <button onClick={() => navigate({}, true)}>Show all indexed assets</button>
              <a href="/browse">Browse the full website directory</a>
            </section>
          ) : (
            <div className={`asset-library-grid asset-density-${density}`}>
              {result.items.map((asset) => (
                <article className="asset-library-card" key={asset.id}>
                  <AssetPreview asset={asset} />
                  <div className="asset-library-card-body">
                    <small>
                      {nameOf(asset.providerId)} ·{' '}
                      {asset.kind === 'icon-pack' ? 'Icon pack' : asset.kind}
                    </small>
                    <h2>
                      <a
                        className="asset-library-card-link"
                        href={assetHref({ ...query, id: asset.id })}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                            return;
                          event.preventDefault();
                          navigate({ id: asset.id });
                        }}
                        aria-label={`Inspect ${asset.name} from ${nameOf(asset.providerId)}`}
                      >
                        {asset.name}
                      </a>
                    </h2>
                    <p>{asset.description}</p>
                    <div className="asset-library-tags">
                      <span>{asset.variants[0]?.framework}</span>
                      <span>{asset.variants[0]?.format.toUpperCase()}</span>
                      <span>{asset.licence.expression}</span>
                    </div>
                  </div>
                  <button
                    className="asset-library-save"
                    aria-label={
                      saved.includes(asset.id) ? `Unsave ${asset.name}` : `Save ${asset.name}`
                    }
                    aria-pressed={saved.includes(asset.id)}
                    onClick={() => toggleSave(asset.id)}
                  >
                    <Bookmark size={16} fill={saved.includes(asset.id) ? 'currentColor' : 'none'} />
                  </button>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && result && (offset > 0 || result.nextOffset !== null) && (
            <nav className="asset-library-pagination" aria-label="Asset pages">
              <div className="asset-library-pagination-summary">
                <strong>
                  Page {currentPage} of {totalPages}
                </strong>
                <span>
                  Showing {firstResult}–{lastResult} of {result.total} assets
                </span>
              </div>
              <div className="asset-library-pagination-controls">
                <button
                  className="asset-library-page-direction"
                  disabled={currentPage === 1}
                  onClick={() => changePage(currentPage - 1)}
                  aria-label="Go to previous asset page"
                >
                  <ArrowLeft size={15} /> Previous
                </button>
                <div
                  className="asset-library-page-numbers"
                  role="group"
                  aria-label="Choose an asset page"
                >
                  {paginationItems(currentPage, totalPages).map((item, index) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className="asset-library-page-number"
                        aria-label={`Go to asset page ${item}`}
                        aria-current={item === currentPage ? 'page' : undefined}
                        onClick={() => changePage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="asset-library-page-direction"
                  disabled={currentPage === totalPages}
                  onClick={() => changePage(currentPage + 1)}
                  aria-label="Go to next asset page"
                >
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
      <p className="asset-library-muted" role="status">
        {notice}
      </p>
      {query.id && (
        <AssetDetail
          key={query.id}
          id={query.id}
          nameOf={nameOf}
          query={query}
          saved={saved.includes(query.id)}
          toggleSave={() => toggleSave(query.id)}
          close={() => navigate({ id: '' })}
        />
      )}
    </section>
  );
}
