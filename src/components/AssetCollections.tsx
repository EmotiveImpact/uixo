import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, X } from 'lucide-react';
import type {
  CollectionInput,
  CollectionItem,
  CollectionRecord,
  PublicCollection,
} from '../../shared/intelligence';
import type { Catalogue, ProviderRecord } from '../lib/asset-library';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import { AssetDetail } from './AssetDetail';
import { RegistryLink, RegistryState, type IntelligenceProps } from './RegistryPrimitives';
import { useRegistryData } from '../hooks/useRegistryData';

type CollectionList<T> = { items: T[]; total: number; nextOffset: number | null };
export function AssetCollections(props: IntelligenceProps) {
  return props.query.view === 'collection-editor' ? (
    <EditorialCollections {...props} />
  ) : props.query.collection ? (
    <PublicCollectionDetail {...props} />
  ) : (
    <PublicCollectionList {...props} />
  );
}
function PublicCollectionList({ query, navigate }: IntelligenceProps) {
  const remote = useRegistryData<CollectionList<PublicCollection>>('collections', {
    offset: String(query.offset),
  });
  return (
    <RegistryState {...remote}>
      <div className="ri-heading">
        <div>
          <span className="ri-eyebrow">EDITORIAL ASSET COLLECTIONS</span>
          <h2>A considered starting point.</h2>
          <p>Deliberate sets of assets and sources, with an explanation for every choice.</p>
        </div>
      </div>
      {!remote.data?.items.length ? (
        <section className="ri-state">
          <h3>No asset collections are published yet.</h3>
          <p>Collections appear here only after a curator reviews and publishes them.</p>
          <a href="/collections">
            Explore the existing website collections <ArrowRight size={15} />
          </a>
        </section>
      ) : (
        <div className="ri-source-grid">
          {remote.data.items.map((c, i) => (
            <article className="ri-source ri-collection" key={c.slug}>
              <span className="ri-collection-number">
                {String(query.offset + i + 1).padStart(2, '0')}
              </span>
              <h3>
                <RegistryLink
                  query={query}
                  navigate={navigate}
                  changes={{ view: 'collections', collection: c.slug }}
                >
                  {c.title}
                </RegistryLink>
              </h3>
              <p>{c.description}</p>
              <div className="ri-actions">
                <span>{c.items.length} available items</span>
                <RegistryLink
                  query={query}
                  navigate={navigate}
                  changes={{ view: 'collections', collection: c.slug }}
                >
                  Explore <ArrowRight size={14} />
                </RegistryLink>
              </div>
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
        <span>{remote.data?.total ?? 0} collections</span>
        <button
          disabled={remote.data?.nextOffset == null}
          onClick={() => navigate({ offset: remote.data?.nextOffset ?? 0 })}
        >
          Next
        </button>
      </div>
    </RegistryState>
  );
}
function PublicCollectionDetail({ query, navigate, assetSaves }: IntelligenceProps) {
  const remote = useRegistryData<PublicCollection>('collection', { slug: query.collection });
  const [notice, setNotice] = useState('');
  const c = remote.data;
  function save(ids: string[]) {
    const next = [...new Set([...assetSaves.saved, ...ids])];
    if (next.length > 200) {
      setNotice('Your saved list holds 200 assets. Remove some before saving this collection.');
      return;
    }
    const persisted = assetSaves.save(next);
    setNotice(
      persisted
        ? assetSaves.accountBacked
          ? 'Assets saved in this browser and queued for account sync.'
          : 'Assets saved in this browser. Sign in to sync across devices.'
        : 'Browser storage is unavailable. These saves last for this tab only.',
    );
  }
  return (
    <>
      <RegistryLink query={query} navigate={navigate} changes={{ view: 'collections' }}>
        <ArrowLeft size={14} /> Asset collections
      </RegistryLink>
      <RegistryState {...remote}>
        {c && (
          <>
            <div className="ri-heading">
              <div>
                <span className="ri-eyebrow">CURATED SELECTION</span>
                <h2>{c.title}</h2>
                <p>{c.description}</p>
              </div>
              <button
                onClick={() =>
                  save(c.items.filter((i) => i.kind === 'asset').map((i) => i.targetId))
                }
              >
                Save available assets
              </button>
            </div>
            {c.unavailableItems > 0 && (
              <p className="ri-notice">
                {c.unavailableItems} collection items are currently unavailable and have been
                withheld.
              </p>
            )}
            <div className="ri-collection-items">
              {c.items.map((i, index) => (
                <article key={i.kind + i.targetId} className="ri-collection-item">
                  <span className="ri-item-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <span className="ri-eyebrow">{i.kind === 'asset' ? 'ASSET' : 'PROVIDER'}</span>
                    <h3>{i.name}</h3>
                    <p>{i.note}</p>
                    <div className="ri-actions">
                      {i.kind === 'asset' ? (
                        <button onClick={() => navigate({ id: i.targetId })}>Inspect asset</button>
                      ) : (
                        <RegistryLink
                          query={query}
                          navigate={navigate}
                          changes={{ view: 'sources', provider: i.targetId }}
                        >
                          Inspect source <ArrowRight size={14} />
                        </RegistryLink>
                      )}
                      <a href={safeAssetUrl(i.sourceUrl)} target="_blank" rel="noopener noreferrer">
                        Original source
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="ri-muted">
              Collection revision {c.revision}. A selection is not a certified installation bundle.
              Review the licence and project compatibility of every item.
            </p>
            <p role="status">{notice}</p>
          </>
        )}
      </RegistryState>
      {query.id && (
        <AssetDetail
          key={query.id}
          id={query.id}
          query={query}
          nameOf={(id) => id}
          saved={assetSaves.saved.includes(query.id)}
          toggleSave={() => {
            if (assetSaves.saved.includes(query.id))
              assetSaves.save(assetSaves.saved.filter((id) => id !== query.id));
            else save([query.id]);
          }}
          close={() => navigate({ id: '' })}
        />
      )}
    </>
  );
}
function EditorialCollections(props: IntelligenceProps) {
  const [create, setCreate] = useState(false);
  const { query, navigate } = props;
  const remote = useRegistryData<CollectionList<CollectionRecord>>(
    'collections-editor',
    { offset: String(query.offset) },
    true,
  );
  if (query.collection) return <ExistingCollectionEditor {...props} />;
  if (create)
    return (
      <>
        <button onClick={() => setCreate(false)}>
          <ArrowLeft size={14} /> Editorial collections
        </button>
        <CollectionForm {...props} initial={null} />
      </>
    );
  return (
    <RegistryState {...remote}>
      <div className="ri-heading">
        <div>
          <span className="ri-eyebrow">COLLECTION EDITORIAL</span>
          <h2>Curate first. Publish deliberately.</h2>
          <p>Draft changes remain separate from the version visitors see.</p>
        </div>
        <button className="ri-primary" onClick={() => setCreate(true)}>
          <Plus size={15} /> New collection
        </button>
      </div>
      {!remote.data?.items.length && (
        <section className="ri-state">
          <h3>Your editorial workspace is empty.</h3>
          <p>
            Create a collection, or run the documented collections-seed command to prepare three
            starter drafts.
          </p>
        </section>
      )}
      {remote.data?.items.map((c) => (
        <article key={c.slug} className="ri-candidate">
          <div>
            <span className="ri-tag">
              {c.publishedRevision
                ? c.hasUnpublishedChanges
                  ? 'Published with draft changes'
                  : 'Published'
                : 'Draft only'}
            </span>
            <h3>{c.title}</h3>
            <p>
              {c.items.length} typed items · revision {c.revision}
            </p>
          </div>
          <RegistryLink
            query={query}
            navigate={navigate}
            changes={{ view: 'collection-editor', collection: c.slug }}
          >
            Edit collection <ArrowRight size={14} />
          </RegistryLink>
        </article>
      ))}
      <div className="ri-pagination">
        <button
          disabled={!query.offset}
          onClick={() => navigate({ offset: Math.max(0, query.offset - 24) })}
        >
          Previous
        </button>
        <span>{remote.data?.total ?? 0} collections</span>
        <button
          disabled={remote.data?.nextOffset == null}
          onClick={() => navigate({ offset: remote.data?.nextOffset ?? 0 })}
        >
          Next
        </button>
      </div>
    </RegistryState>
  );
}
function ExistingCollectionEditor(props: IntelligenceProps) {
  const remote = useRegistryData<CollectionRecord>(
    'collection-editor',
    { slug: props.query.collection },
    true,
  );
  return (
    <>
      <RegistryLink
        query={props.query}
        navigate={props.navigate}
        changes={{ view: 'collection-editor' }}
      >
        <ArrowLeft size={14} /> Editorial collections
      </RegistryLink>
      <RegistryState {...remote}>
        {remote.data && <CollectionForm key={remote.data.slug} {...props} initial={remote.data} />}
      </RegistryState>
    </>
  );
}
function CollectionForm({
  initial,
  navigate,
}: IntelligenceProps & { initial: CollectionRecord | null }) {
  const [form, setForm] = useState<CollectionInput>(
    () => initial ?? { slug: '', title: '', description: '', items: [] },
  );
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const [published, setPublished] = useState(initial?.publishedRevision ?? null);
  const [dirty, setDirty] = useState(false),
    [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  function edit(changes: Partial<CollectionInput>) {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
    setNotice('');
  }
  function add(item: CollectionItem) {
    if (
      form.items.length >= 48 ||
      form.items.some((i) => i.kind === item.kind && i.targetId === item.targetId)
    )
      return;
    edit({ items: [...form.items, item] });
  }
  async function mutate(action: 'collection-save' | 'collection-publish', decision?: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await registryRequest<CollectionRecord>(action, {
        authenticated: true,
        body:
          action === 'collection-save'
            ? { ...form, expectedRevision: revision }
            : { slug: form.slug, expectedRevision: revision, decision, reason },
      });
      setForm(updated);
      setRevision(updated.revision);
      setPublished(updated.publishedRevision);
      setDirty(false);
      setNotice(
        action === 'collection-save'
          ? 'Draft saved. The public version is unchanged.'
          : decision === 'publish'
            ? 'Reviewed collection published.'
            : 'Collection removed from public discovery. The draft is retained.',
      );
      if (!initial) navigate({ view: 'collection-editor', collection: updated.slug }, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Editorial operation failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="ri-editor" disabled={busy} aria-busy={busy}>
      <div className="ri-heading">
        <div>
          <span className="ri-eyebrow">
            {published ? 'PUBLISHED COLLECTION / EDITORIAL DRAFT' : 'PRIVATE EDITORIAL DRAFT'}
          </span>
          <h2>{initial ? 'Refine the selection.' : 'Build a useful starting point.'}</h2>
          <p>
            Revision {revision || 'not yet saved'} · {form.items.length}/48 items
          </p>
        </div>
      </div>
      {error && (
        <p className="ri-notice" role="alert">
          {error} Your unsaved editor state has been retained.
        </p>
      )}
      {notice && (
        <p role="status" className="ri-notice">
          {notice}
        </p>
      )}
      <div className="ri-two-columns">
        <section>
          <label>
            Collection title
            <input
              value={form.title}
              maxLength={150}
              onChange={(e) => edit({ title: e.target.value })}
            />
          </label>
          <label>
            Stable slug
            <input
              value={form.slug}
              maxLength={80}
              disabled={revision > 0}
              placeholder="dashboard-foundations"
              onChange={(e) =>
                edit({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
              }
            />
          </label>
          <label>
            Editorial introduction
            <textarea
              rows={4}
              value={form.description}
              maxLength={3000}
              onChange={(e) => edit({ description: e.target.value })}
            />
          </label>
          <button
            className="ri-primary"
            disabled={
              busy ||
              !form.title.trim() ||
              !form.slug ||
              !form.description.trim() ||
              !form.items.length
            }
            onClick={() => void mutate('collection-save')}
          >
            Save draft
          </button>
        </section>
        <CollectionPicker items={form.items} add={add} disabled={busy} />
      </div>
      <section className="ri-section">
        <h3>The selection, in order</h3>
        {!form.items.length && <p>Add an asset or approved provider to start.</p>}
        {form.items.map((item, index) => (
          <article className="ri-editor-item" key={item.kind + item.targetId}>
            <div className="ri-item-title">
              <strong>
                {index + 1}. {item.targetId}
              </strong>
              <span className="ri-tag">{item.kind}</span>
              <div className="ri-actions">
                <button
                  disabled={busy || index === 0}
                  aria-label={`Move ${item.targetId} up`}
                  onClick={() => {
                    const items = [...form.items];
                    [items[index - 1], items[index]] = [items[index], items[index - 1]];
                    edit({ items });
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  disabled={busy || index === form.items.length - 1}
                  aria-label={`Move ${item.targetId} down`}
                  onClick={() => {
                    const items = [...form.items];
                    [items[index], items[index + 1]] = [items[index + 1], items[index]];
                    edit({ items });
                  }}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  disabled={busy}
                  aria-label={`Remove ${item.targetId}`}
                  onClick={() => edit({ items: form.items.filter((_, i) => i !== index) })}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <label>
              Why this item belongs
              <textarea
                rows={2}
                value={item.note}
                maxLength={1200}
                onChange={(e) =>
                  edit({
                    items: form.items.map((it, i) =>
                      i === index ? { ...it, note: e.target.value } : it,
                    ),
                  })
                }
              />
            </label>
          </article>
        ))}
      </section>
      <section className="ri-panel">
        <h3>Publication decision</h3>
        <p>Publishing releases the saved draft. Saving alone never changes the public selection.</p>
        <label>
          Review reason
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {dirty && <p className="ri-muted">Save your changes before publishing.</p>}
        <div className="ri-actions">
          <button
            className="ri-primary"
            disabled={busy || dirty || !revision || reason.trim().length < 10}
            onClick={() => void mutate('collection-publish', 'publish')}
          >
            Publish reviewed version
          </button>
          <button
            disabled={busy || dirty || !published || reason.trim().length < 10}
            onClick={() => void mutate('collection-publish', 'unpublish')}
          >
            Unpublish collection
          </button>
        </div>
      </section>
    </fieldset>
  );
}
function CollectionPicker({
  items,
  add,
  disabled,
}: {
  items: CollectionItem[];
  add: (item: CollectionItem) => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState(''),
    [search, setSearch] = useState(''),
    [provider, setProvider] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(timer);
  }, [input]);
  const assets = useRegistryData<Catalogue>('search', { q: search, limit: '8' });
  const providers = useRegistryData<{ items: ProviderRecord[] }>('providers');
  const contains = (kind: string, id: string) =>
    items.some((i) => i.kind === kind && i.targetId === id);
  return (
    <section className="ri-panel">
      <h3>Find something worth including.</h3>
      <label>
        Search published assets
        <input
          value={input}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Navigation, cards, forms…"
        />
      </label>
      <RegistryState {...assets}>
        {assets.data?.items.map((a) => (
          <div className="ri-picker-row" key={a.id}>
            <span>
              <strong>{a.name}</strong>
              <small>
                {a.providerId} · {a.kind}
              </small>
            </span>
            <button
              disabled={disabled || items.length >= 48 || contains('asset', a.id)}
              onClick={() => add({ kind: 'asset', targetId: a.id, note: '' })}
              aria-label={`Add ${a.name}`}
            >
              {contains('asset', a.id) ? 'Added' : <Plus size={15} />}
            </button>
          </div>
        ))}
      </RegistryState>
      <label>
        Add an approved provider
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">Choose a source</option>
          {providers.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={disabled || !provider || items.length >= 48 || contains('provider', provider)}
        onClick={() => add({ kind: 'provider', targetId: provider, note: '' })}
      >
        Add provider
      </button>
      {providers.error && <p role="alert">{providers.error}</p>}
    </section>
  );
}
