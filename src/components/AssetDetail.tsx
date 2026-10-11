import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  Link2,
  Monitor,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import { AssetProvenance } from './AssetProvenance';
import { AssetPreview } from './AssetPreview';
import { ComponentCard, PriceLabel, ProviderMarkSquare } from './ComponentCard';
import { InstallCommand } from './InstallCommand';
import { LoadError } from './LoadError';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { commandText } from '../lib/package-manager';
import {
  EMPTY_ASSET_QUERY,
  assetHref,
  catalogueResult,
  registryRequest,
  safeAssetUrl,
} from '../lib/asset-library';
import { assetDestinationUrl } from '../lib/asset-destination';
import { frameworkLabel, installChecklist } from '../lib/install-checklist';
import { highlightLine } from '../lib/highlight-code';
import { licenceLabel } from '../lib/licence-label';
import { isWarmHue, stableHash, stageHue } from '../lib/stage-hue';
import { COMPONENT_CATEGORIES } from '../../shared/component-categories';
import { customisableDemo } from '../../shared/demo-props';
import type { DemoPropValues, PropControl } from '../../shared/demo-props';
import demos from '../../live-demos/manifest.json';
import type { Acquisition, AssetQuery, AssetRecord } from '../lib/asset-library';
import './asset-detail.css';

type StageBackground = 'studio' | 'dark' | 'light' | 'grid';
type StageWidth = 'desktop' | 'phone';

const BACKGROUNDS: { id: StageBackground; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'grid', label: 'Grid' },
];

const COPIED_FOR = 1600;

const modified = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

function categoryLabel(asset: AssetRecord) {
  if (asset.kind === 'icon-pack') return 'Icon packs';
  if (asset.kind === 'font') return 'Fonts';
  return COMPONENT_CATEGORIES.find((entry) => entry.id === asset.category)?.label ?? 'Components';
}

function variantLabel(variant: AssetRecord['variants'][number]) {
  const framework =
    variant.framework === 'agnostic'
      ? 'Framework agnostic'
      : frameworkLabel({ framework: variant.framework, css: null });
  return `${framework} · ${variant.format.toUpperCase()}`;
}

/** Arrow keys move between the tabs of a tablist, as the ARIA pattern expects. */
function tabKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}

function useCopy() {
  const [state, setState] = useState<'' | 'copied' | 'failed'>('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy(value: string) {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    timer.current = window.setTimeout(() => setState(''), COPIED_FOR);
  }
  return [state, copy] as const;
}

function CodeView({
  code,
  fileName,
  loading,
  fallback,
}: {
  code: string;
  fileName: string;
  loading: boolean;
  fallback: React.ReactNode;
}) {
  const [copied, copy] = useCopy();
  const lines = useMemo(() => code.replace(/\n+$/, '').split('\n'), [code]);
  if (!code)
    return (
      <div className="ad-code" role="tabpanel" id="ad-panel-code" aria-labelledby="ad-tab-code">
        <div className="ad-code-empty">
          {loading ? <p role="status">Loading the demo source…</p> : fallback}
        </div>
      </div>
    );
  return (
    <div className="ad-code" role="tabpanel" id="ad-panel-code" aria-labelledby="ad-tab-code">
      <div className="ad-code-head">
        <span>{fileName}</span>
        <button
          type="button"
          className="ad-copy is-ghost"
          data-state={copied || undefined}
          onClick={() => void copy(code)}
        >
          {copied === 'copied' ? <Check size={15} /> : <Copy size={15} />}
          <span>
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Select to copy' : 'Copy code'}
          </span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={`Source of ${fileName}`}>
        <code>
          {lines.map((line, index) => (
            <span className="ad-line" key={index}>
              {highlightLine(line).map((token, n) =>
                token.kind ? (
                  <span className={`tk-${token.kind}`} key={n}>
                    {token.text}
                  </span>
                ) : (
                  token.text
                ),
              )}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Spoken units for range controls, so a screen reader hears "2.5 seconds", not "2.5 s". */
const UNIT_WORDS: Record<string, [string, string]> = {
  s: ['second', 'seconds'],
  ms: ['millisecond', 'milliseconds'],
  px: ['pixel', 'pixels'],
  '×': ['times', 'times'],
  '°': ['degree', 'degrees'],
  '%': ['percent', 'percent'],
};

function rangeValueText(value: number, unit: string) {
  const words = UNIT_WORDS[unit];
  if (!words) return `${value}${unit}`;
  return `${value} ${value === 1 ? words[0] : words[1]}`;
}

function Control({
  name,
  control,
  value,
  onChange,
}: {
  name: string;
  control: PropControl;
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  const id = `ad-control-${name}`;
  if (control.kind === 'range') {
    const progress = ((Number(value) - control.min) / (control.max - control.min)) * 100;
    return (
      <div className="ad-control">
        <label htmlFor={id}>
          {name} <span>{`${value}${control.unit}`}</span>
        </label>
        <input
          id={id}
          className="ad-range"
          type="range"
          aria-label={UNIT_WORDS[control.unit] ? `${name}, ${UNIT_WORDS[control.unit][1]}` : name}
          aria-valuetext={rangeValueText(Number(value), control.unit)}
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          style={{ '--p': `${progress}%` } as CSSProperties}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    );
  }
  if (control.kind === 'text')
    return (
      <div className="ad-control is-wide">
        <label htmlFor={id}>
          {name} <span>ReactNode</span>
        </label>
        <input
          id={id}
          className="ad-text"
          value={String(value)}
          maxLength={control.maxLength}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  return (
    <div className="ad-control">
      <div className="ad-control-label" id={id}>
        {name} <span>{String(value)}</span>
      </div>
      <div className="ad-swatches" role="group" aria-labelledby={id}>
        {control.kind === 'color'
          ? control.options.map((option) => (
              <button
                type="button"
                key={option}
                className="ad-swatch"
                style={{ background: option }}
                aria-pressed={value === option}
                aria-label={`${name} ${option}`}
                title={option}
                onClick={() => onChange(option)}
              />
            ))
          : control.options.map((option) => (
              <button
                type="button"
                key={option.label}
                className="ad-swatch is-palette"
                style={{ background: `linear-gradient(135deg, ${option.colors.join(', ')})` }}
                aria-pressed={value === option.label}
                aria-label={`${name}: ${option.label}`}
                title={option.label}
                onClick={() => onChange(option.label)}
              />
            ))}
      </div>
    </div>
  );
}

/**
 * Three neighbours: live demos first, then a stable shuffle seeded by this page, so each
 * page shows a different trio, preferring three different categories.
 */
function pickRelated(id: string, items: AssetRecord[]): AssetRecord[] {
  const ranked = [...items].sort((a, b) => {
    const live = Number(Object.hasOwn(demos, b.id)) - Number(Object.hasOwn(demos, a.id));
    return live || stableHash(id + a.id) - stableHash(id + b.id);
  });
  const picked: AssetRecord[] = [];
  for (const item of ranked)
    if (picked.length < 3 && !picked.some((entry) => entry.category === item.category))
      picked.push(item);
  for (const item of ranked) if (picked.length < 3 && !picked.includes(item)) picked.push(item);
  return picked;
}

type RelatedSaves = { isSaved: (id: string) => boolean; toggle: (id: string) => void };

export function AssetDetail({
  id,
  nameOf,
  saved,
  toggleSave,
  query,
  navigate,
  related: relatedSaves,
}: {
  id: string;
  nameOf: (id: string) => string;
  saved: boolean;
  toggleSave: () => void;
  query: AssetQuery;
  navigate?: (changes: Partial<AssetQuery>, reset?: boolean) => void;
  related?: RelatedSaves;
}) {
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
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
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [background, setBackground] = useState<StageBackground>('studio');
  const [width, setWidth] = useState<StageWidth>('desktop');
  const [replay, setReplay] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [source, setSource] = useState<{ id: string; text: string } | null>(null);
  const [relatedItems, setRelatedItems] = useState<AssetRecord[] | null>(null);
  const [linkCopied, copyLink] = useCopy();
  const stageRef = useRef<HTMLDivElement>(null);
  const customisable = customisableDemo(id);
  const [values, setValues] = useState<DemoPropValues | undefined>(customisable?.defaults);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
  }, [id]);

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
  }, [id, query.framework, query.format, attempt]);

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

  // More from the same provider, topped up from the same category, never the asset itself.
  const showRelated = Boolean(relatedSaves);
  useEffect(() => {
    if (!asset || !showRelated) return;
    const abort = new AbortController();
    const search = (parameters: Record<string, string>) =>
      registryRequest<unknown>('search', {
        query: { kind: 'component', limit: '24', offset: '0', sort: 'relevant', ...parameters },
        signal: abort.signal,
      }).then(catalogueResult);
    void (async () => {
      try {
        const own = (await search({ provider: asset.providerId })).items;
        let items = own.filter((item) => item.id !== asset.id);
        if (items.length < 3 && asset.category) {
          const more = (await search({ category: asset.category })).items;
          items = [
            ...items,
            ...more.filter(
              (item) => item.id !== asset.id && !items.some((entry) => entry.id === item.id),
            ),
          ];
        }
        if (!abort.signal.aborted) setRelatedItems(pickRelated(asset.id, items));
      } catch {
        if (!abort.signal.aborted) setRelatedItems([]);
      }
    })();
    return () => abort.abort();
  }, [asset, showRelated]);

  const liveEntry = (demos as Record<string, { file: string }>)[id];
  const wantsSource = view === 'code' && !customisable && Boolean(liveEntry);
  useEffect(() => {
    if (!wantsSource || source?.id === id) return;
    const abort = new AbortController();
    void fetch(`/live-demos/sources/${id}.txt`, { signal: abort.signal })
      .then((response) => {
        const type = response.headers.get('content-type') ?? '';
        if (!response.ok || type.includes('html')) throw new Error('No source');
        return response.text();
      })
      .then((text) => setSource({ id, text }))
      .catch(() => {
        if (!abort.signal.aborted) setSource({ id, text: '' });
      });
    return () => abort.abort();
  }, [wantsSource, id, source?.id]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      setStageSize({ width: element.clientWidth, height: element.clientHeight }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [asset, view, width]);

  const selected = asset?.variants.find((item) => item.id === variant);
  const current = resolution?.variant === variant ? resolution : null;
  const result = current?.result;
  const destinationUrl = asset ? assetDestinationUrl(asset, result?.url) : undefined;
  const sourceUrl = asset ? safeAssetUrl(asset.sourceUrl) : undefined;
  const command = commandText(result);
  const providerName = asset ? nameOf(asset.providerId) : '';
  const hue = stageHue(id);
  useDocumentTitle(asset?.name);

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

  const go = (event: MouseEvent<HTMLAnchorElement>, changes: Partial<AssetQuery>) => {
    if (!navigate || modified(event)) return;
    event.preventDefault();
    navigate(changes, true);
  };
  const category = asset ? categoryLabel(asset) : '';
  const licence = asset ? licenceLabel(asset) : null;
  const categoryQuery: Partial<AssetQuery> | null =
    asset?.kind === 'component' && asset.category
      ? { kind: 'component', category: asset.category }
      : asset?.kind === 'icon-pack' || asset?.kind === 'font'
        ? { kind: asset.kind }
        : null;
  const checklist = asset ? installChecklist(asset, selected, result, providerName) : [];
  const code =
    customisable && values ? customisable.code(values) : source?.id === id ? source.text : '';
  const fileName = customisable?.fileName ?? liveEntry?.file.split('/').pop() ?? '';
  const live = Boolean(liveEntry) || Boolean(customisable);
  const stageTheme = background === 'dark' ? 'dark' : background === 'light' ? 'light' : undefined;
  const stageDimensions = `${Math.round(stageSize.width)} × ${Math.round(stageSize.height)}`;
  const hint = customisable
    ? 'Change the props below and the preview follows'
    : live
      ? 'Live demo, try it right here'
      : asset?.preview?.kind === 'image'
        ? `Screenshot from ${providerName}`
        : `Preview from ${providerName}`;

  return (
    <article className="ad" aria-labelledby="asset-detail-title">
      <div className="ad-crumbs">
        <nav aria-label="Breadcrumb">
          <ol>
            <li>
              <a
                href={assetHref({ ...EMPTY_ASSET_QUERY, kind: 'component' })}
                onClick={(event) => go(event, { kind: 'component' })}
              >
                Components
              </a>
            </li>
            {asset && categoryQuery && (
              <li>
                <ChevronRight size={13} aria-hidden="true" />
                <a
                  href={assetHref({ ...EMPTY_ASSET_QUERY, ...categoryQuery })}
                  onClick={(event) => go(event, categoryQuery)}
                >
                  {category}
                </a>
              </li>
            )}
            {asset && (
              <li>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current="page">{asset.name}</span>
              </li>
            )}
          </ol>
        </nav>
        {asset && (
          <button
            type="button"
            className="ad-link-copy"
            data-state={linkCopied || undefined}
            aria-label={linkCopied === 'copied' ? 'Link copied' : 'Copy link'}
            title="Copy link"
            onClick={() => void copyLink(window.location.href)}
          >
            {linkCopied === 'copied' ? <Check size={14} /> : <Link2 size={14} />}
            <span className="ad-link-copy-label">
              {linkCopied === 'copied' ? 'Link copied' : 'Copy link'}
            </span>
          </button>
        )}
      </div>

      {error && (
        <LoadError
          subject="component"
          headingLevel="h1"
          assetId={id}
          details={error}
          onRetry={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
          browseHref={assetHref({ ...EMPTY_ASSET_QUERY, kind: 'component' })}
          onBrowse={(event) => go(event, { kind: 'component' })}
        />
      )}
      {!asset && !error && (
        <div className="ad-split" aria-busy="true">
          <div className="ad-stagecol">
            <div className="ad-stage is-pending" />
          </div>
          <div className="ad-aside">
            <p className="ad-message" role="status">
              Loading component…
            </p>
          </div>
        </div>
      )}

      {asset && (
        <>
          <div className="ad-split">
            <div className="ad-stagecol">
              <div className="ad-toolbar">
                <div className="ad-seg" role="tablist" aria-label="View" onKeyDown={tabKeys}>
                  <button
                    type="button"
                    role="tab"
                    id="ad-tab-preview"
                    aria-selected={view === 'preview'}
                    aria-controls="ad-panel-preview"
                    tabIndex={view === 'preview' ? 0 : -1}
                    onClick={() => setView('preview')}
                  >
                    <Eye size={14} aria-hidden="true" />
                    Preview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="ad-tab-code"
                    aria-selected={view === 'code'}
                    aria-controls="ad-panel-code"
                    tabIndex={view === 'code' ? 0 : -1}
                    onClick={() => setView('code')}
                  >
                    <Code2 size={14} aria-hidden="true" />
                    Code
                  </button>
                </div>
                <span className="ad-push" />
                {view === 'preview' && (
                  <>
                    <div
                      className="ad-seg ad-backgrounds"
                      role="group"
                      aria-label="Stage background"
                    >
                      {BACKGROUNDS.map((entry) => (
                        <button
                          type="button"
                          key={entry.id}
                          aria-pressed={background === entry.id}
                          aria-label={`${entry.label} background`}
                          title={`${entry.label} background`}
                          onClick={() => setBackground(entry.id)}
                        >
                          <span
                            className={`ad-bg-dot is-${entry.id}`}
                            style={{ '--h': hue } as CSSProperties}
                            aria-hidden="true"
                          />
                          <span className="ad-bg-label">{entry.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="ad-seg ad-widths" role="group" aria-label="Preview width">
                      <button
                        type="button"
                        aria-pressed={width === 'desktop'}
                        aria-label="Desktop width"
                        title="Desktop width"
                        onClick={() => setWidth('desktop')}
                      >
                        <Monitor size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-pressed={width === 'phone'}
                        aria-label="Phone width"
                        title="Phone width"
                        onClick={() => setWidth('phone')}
                      >
                        <Smartphone size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="ad-tool"
                      aria-label="Replay preview"
                      title="Replay preview"
                      onClick={() => setReplay((value) => value + 1)}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>

              <div className="ad-stage" data-view={view}>
                {view === 'preview' ? (
                  <div
                    className={`ad-sin g-stage is-bg-${background} ${background === 'studio' ? 'g-tint' : ''} ${
                      isWarmHue(hue) ? 'is-warm' : ''
                    }`}
                    style={{ '--h': hue } as CSSProperties}
                    role="tabpanel"
                    id="ad-panel-preview"
                    aria-labelledby="ad-tab-preview"
                  >
                    <div className={`ad-viewport is-${width}`} ref={stageRef}>
                      <AssetPreview
                        key={`${replay}-${width}`}
                        asset={asset}
                        detail
                        stage
                        zoom={width === 'desktop'}
                        theme={stageTheme}
                        demoProps={values}
                      />
                    </div>
                    <span className="ad-hint">
                      <span className="ad-hint-width">
                        {width === 'phone' ? 'Phone' : 'Desktop'} ·{' '}
                      </span>
                      {stageDimensions}
                    </span>
                    <span className="ad-hint is-end">{hint}</span>
                  </div>
                ) : (
                  <CodeView
                    code={code}
                    fileName={fileName}
                    loading={wantsSource && source?.id !== id}
                    fallback={
                      <>
                        <p>
                          <strong>
                            The source for {asset.name} lives with {providerName}.
                          </strong>
                        </p>
                        <p>
                          {command
                            ? 'Install it with the command on the right, or read the original source.'
                            : 'Read the original source and copy what you need.'}
                        </p>
                        {sourceUrl && (
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                            View source on {providerName}
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </a>
                        )}
                      </>
                    }
                  />
                )}
              </div>

              {asset.variants.length > 1 && (
                <div className="ad-variants" role="group" aria-label="Choose a variant">
                  {asset.variants.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={item.id === variant}
                      onClick={() => {
                        setVariant(item.id);
                        setCompatibility(null);
                        setNotice('');
                      }}
                    >
                      <span>{variantLabel(item)}</span>
                      <Check size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {customisable && values && (
                <section className="ad-play" aria-labelledby="ad-play-title">
                  <div className="ad-play-head">
                    <div>
                      <h2 id="ad-play-title">Customise</h2>
                      <p>Change a prop and the preview and code update as you go.</p>
                    </div>
                    <button
                      type="button"
                      className="ad-reset"
                      onClick={() => setValues(customisable.defaults)}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                  <div className="ad-play-grid">
                    {customisable.props
                      .filter((prop) => prop.control)
                      .map((prop) => (
                        <Control
                          key={prop.name}
                          name={prop.name}
                          control={prop.control!}
                          value={values[prop.name]}
                          onChange={(value) =>
                            setValues((currentValues) => ({ ...currentValues, [prop.name]: value }))
                          }
                        />
                      ))}
                  </div>
                </section>
              )}

              {checklist.length > 0 && (
                <section className="ad-before" aria-labelledby="ad-before-title">
                  <h2 id="ad-before-title">Before you install</h2>
                  <ul>
                    {checklist.map((item) => (
                      <li key={item.id}>
                        <Check size={16} aria-hidden="true" />
                        <span>
                          {item.parts.map((part, index) =>
                            typeof part === 'string' ? part : <code key={index}>{part.code}</code>,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {current?.error && <p role="alert">{current.error}</p>}
                  {result?.message && <p className="ad-note">{result.message}</p>}
                </section>
              )}
            </div>

            <aside className="ad-aside" aria-label={`About ${asset.name}`}>
              <div className="ad-head">
                <p className="ad-kicker">{category}</p>
                <h1 id="asset-detail-title">{asset.name}</h1>
                <p className="ad-byline">
                  <ProviderMarkSquare id={asset.providerId} name={providerName} />
                  <span>{providerName}</span>
                  <span className="ad-sep" aria-hidden="true">
                    ·
                  </span>
                  {licence && <PriceLabel label={licence} />}
                  {licence?.settled && (
                    <>
                      <span className="ad-sep" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {/^[\w.+-]+$/.test(asset.licence.expression)
                          ? `${asset.licence.expression} licence`
                          : asset.licence.expression}
                      </span>
                    </>
                  )}
                </p>
                {licence?.detail && <p className="ad-licence-note">{licence.detail}</p>}
                <p className="ad-desc">{asset.description}</p>
              </div>

              <div className="ad-buy">
                {command ? (
                  <InstallCommand command={command} />
                ) : (
                  !current && (
                    <p className="install-command-pending" role="status">
                      Finding the install command…
                    </p>
                  )
                )}

                <div className="ad-actions">
                  <button type="button" aria-pressed={saved} onClick={toggleSave}>
                    {saved ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <Bookmark size={16} aria-hidden="true" />
                    )}
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  {destinationUrl && (
                    <a href={destinationUrl} target="_blank" rel="noopener noreferrer">
                      {asset.kind === 'icon-pack' ? 'Browse icon pack' : `View on ${providerName}`}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              {customisable && (
                <section className="ad-props" aria-labelledby="ad-props-title">
                  <h2 id="ad-props-title">Props</h2>
                  <p className="ad-legend">
                    <i aria-hidden="true" />
                    Marked props change live in Customise
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Prop</th>
                        <th scope="col">Type</th>
                        <th scope="col">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customisable.props.map((prop) => (
                        <tr key={prop.name} className={prop.control ? 'is-live' : undefined}>
                          <td className="ad-prop-name">
                            {prop.name}
                            {prop.control && <span className="sr-only"> (live)</span>}
                            <small>{prop.description}</small>
                          </td>
                          <td>
                            <span className="ad-type">{prop.type}</span>
                          </td>
                          <td className="ad-default">{prop.defaultValue || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <div className="ad-info">
                <dl className="ad-facts">
                  <dt>Provider</dt>
                  <dd>{providerName}</dd>
                  <dt>Category</dt>
                  <dd>{category}</dd>
                  <dt>Framework</dt>
                  <dd>{frameworkLabel(selected) || '–'}</dd>
                  <dt>Format</dt>
                  <dd>{selected?.format.toUpperCase() ?? '–'}</dd>
                  <dt>Licence</dt>
                  <dd>{asset.licence.expression}</dd>
                  {asset.verifiedAt && (
                    <>
                      <dt>Last checked</dt>
                      <dd>
                        {new Date(asset.verifiedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </dd>
                    </>
                  )}
                </dl>

                <details className="ad-more">
                  <summary>Project fit</summary>
                  <div className="ad-compat-fields">
                    <label>
                      Framework
                      <select
                        value={framework}
                        onChange={(event) => setFramework(event.target.value)}
                      >
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
                  <button type="button" disabled={checking} onClick={() => void check()}>
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

                <details className="ad-more">
                  <summary>Licence &amp; provenance</summary>
                  <AssetProvenance asset={asset} variantId={variant} providerName={providerName} />
                  <p>{asset.licence.note}</p>
                  <p>
                    <strong>Commercial use:</strong> {asset.licence.commercial}
                  </p>
                  <p>
                    <strong>Redistribution</strong>: {asset.licence.redistribution}
                  </p>
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
                </details>
                <p className="ad-notice" role="status">
                  {notice}
                </p>
              </div>
            </aside>
          </div>

          {relatedSaves && relatedItems && relatedItems.length > 0 && (
            <section className="ad-related" aria-labelledby="ad-related-title">
              <div className="ad-related-head">
                <div>
                  <p className="ad-kicker">More from {providerName}</p>
                  <h2 id="ad-related-title">Related components</h2>
                </div>
                <a
                  href={assetHref({ ...EMPTY_ASSET_QUERY, provider: asset.providerId })}
                  onClick={(event) => go(event, { provider: asset.providerId })}
                >
                  All {providerName}
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
              <div className="ad-related-grid">
                {relatedItems.map((item) => (
                  <ComponentCard
                    key={item.id}
                    asset={item}
                    href={assetHref({ ...EMPTY_ASSET_QUERY, id: item.id })}
                    onOpen={() => navigate?.({ id: item.id })}
                    providerName={nameOf(item.providerId)}
                    categoryLabel={categoryLabel(item)}
                    saved={relatedSaves.isSaved(item.id)}
                    onToggleSave={() => relatedSaves.toggle(item.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </article>
  );
}
