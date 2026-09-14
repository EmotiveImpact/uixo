import { COMPONENT_CATEGORIES, componentCategory } from '../shared/component-categories.ts';
import { createHash } from 'node:crypto';

export type Permission = 'allowed' | 'restricted' | 'unknown';
export type Licence = {
  id: string;
  expression: string;
  sourceUrl: string;
  text: string;
  commercial: Permission;
  redistribution: Permission;
  attribution: boolean;
  checkedAt: string | null;
  note: string;
};
export type Evidence = {
  field: string;
  url: string;
  reference: string | null;
  observedAt: string;
  method: 'declared' | 'inferred' | 'inspected';
};
export type Variant = {
  id: string;
  framework: string;
  format: string;
  css: string | null;
  dependencies: string[];
  registryDependencies?: string[];
  peerDependencies: Record<string, string>;
  sourceRef: string | null;
  acquisition: {
    kind: 'registry' | 'package' | 'direct' | 'external' | 'purchase';
    url: string;
    packageName?: string;
  };
};
export type Asset = {
  id: string;
  providerId: string;
  slug: string;
  name: string;
  description: string;
  kind: 'component' | 'icon' | 'icon-pack' | 'font' | 'template';
  category?: string;
  tags: string[];
  price: 'free' | 'paid' | 'unknown';
  sourceUrl: string;
  licence: Licence;
  variants: Variant[];
  evidence: Evidence[];
  verifiedAt: string | null;
  preview: { kind: 'image'; url: string; label: string } | null;
  editorialPick: boolean;
};
export type Provider = {
  id: string;
  name: string;
  url: string;
  repo: string;
  branch: 'main' | 'master';
  licencePath: string;
  adapter: 'github-icons' | 'shadcn-registry' | 'github-json-registry' | 'reviewed-gallery';
  registryPath?: string;
  registryBaseUrl?: string;
  /** Repository prefix applied to install-registry file paths before linking source. */
  sourceRoot?: string;
  /** Manifest entries that are not backed by a file at the same pinned source revision. */
  excludedComponents?: string[];
  css?: string;
  approved: boolean;
  rationale: string;
  selectedAt: string | null;
};
export type Search = {
  q: string;
  provider: string;
  kind: string;
  category: string;
  framework: string;
  format: string;
  price: string;
  commercial: boolean;
  limit: number;
  offset: number;
  saved: string[];
  terms: string[];
};
export class RegistryError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    this.status = status;
  }
}
export const fail = (message: string): never => {
  throw new RegistryError('INVALID_INPUT', message);
};
function hasDisallowedControl(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail('Expected a JSON object.');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 300, optional = false): string {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    hasDisallowedControl(value)
  )
    return fail(`Expected text between 1 and ${max} characters.`);
  return value.trim();
}
export function identifier(value: unknown): string {
  const id = text(value, 180);
  if (!/^[a-z0-9][a-z0-9._/-]*$/.test(id) || id.includes('..') || id.includes('//'))
    return fail('Invalid identifier.');
  return id;
}
export function httpsUrl(value: unknown): string {
  const raw = text(value, 2048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail('Expected an absolute HTTPS URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.local') ||
    /^[\d.[\]:]+$/.test(url.hostname)
  )
    return fail('Only public HTTPS URLs without credentials are accepted.');
  url.hash = '';
  return url.toString();
}
export function canonicalUrl(value: unknown): string {
  const url = new URL(httpsUrl(value));
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid|ref|s|t)$/.test(key)) url.searchParams.delete(key);
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.sort();
  return url.toString();
}
export function strings(value: unknown, max = 40): string[] {
  if (!Array.isArray(value) || value.length > max) return fail(`Expected at most ${max} entries.`);
  return [...new Set(value.map((entry) => text(entry, 150)))];
}
export function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(n) || n < min || n > max)
    return fail(`Expected an integer between ${min} and ${max}.`);
  return n;
}
function choice(value: unknown, choices: string[], fallback = ''): string {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !choices.includes(value))
    return fail(`Expected one of: ${choices.join(', ')}.`);
  return value;
}
export function parseSearch(input: unknown): Search {
  const raw = record(input);
  const q = text(raw.q, 300, true).toLowerCase();
  let framework = choice(raw.framework, ['react', 'vue', 'html', 'agnostic']);
  let format = choice(raw.format, ['tsx', 'jsx', 'svg', 'css', 'woff2']);
  let price = choice(raw.price, ['free', 'paid', 'unknown']);
  const commercial = raw.commercial === true || raw.commercial === 'true';
  if (
    raw.commercial !== undefined &&
    ![true, false, 'true', 'false', ''].includes(raw.commercial as never)
  )
    return fail('commercial must be true or false.');
  if (!framework && /\breact\b/.test(q)) framework = 'react';
  if (!framework && /\bvue\b/.test(q)) framework = 'vue';
  if (!format && /\bsvg\b/.test(q)) format = 'svg';
  if (!price && /\bfree\b/.test(q)) price = 'free';
  const stop = new Set(
    'a an the find me for with and or to of that suitable works work good great best premium please component components assets asset react vue svg free commercially commercial use usable'.split(
      ' ',
    ),
  );
  const terms = [
    ...new Set(
      q
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((term) => term && !stop.has(term)),
    ),
  ]
    .slice(0, 12)
    .map(
      (term) => ({ icons: 'icon', monochrome: 'outline', navigation: 'navigation' })[term] ?? term,
    );
  return {
    q,
    provider: raw.provider ? identifier(raw.provider) : '',
    kind:
      raw.kind === 'icon'
        ? 'icon-pack'
        : choice(raw.kind, ['component', 'icon-pack', 'font', 'template']),
    category: choice(
      raw.category,
      COMPONENT_CATEGORIES.map((entry) => entry.id),
    ),
    framework,
    format,
    price,
    commercial: commercial || /\bcommercial(?:ly)?\b/.test(q),
    limit: integer(raw.limit, 24, 1, 48),
    offset: integer(raw.offset, 0, 0, 100000),
    saved: raw.saved ? strings(raw.saved, 200).map(identifier) : [],
    terms,
  };
}
export function validateAsset(input: unknown): Asset {
  const a = record(input),
    l = record(a.licence);
  const permission = (v: unknown) =>
    choice(v, ['allowed', 'restricted', 'unknown'], 'unknown') as Permission;
  const variants = a.variants;
  if (!Array.isArray(variants) || !variants.length || variants.length > 12)
    return fail('An asset needs between 1 and 12 variants.');
  const evidence = a.evidence;
  if (!Array.isArray(evidence) || !evidence.length || evidence.length > 30)
    return fail('Source evidence is required.');
  const timestamp = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = text(v, 40);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(s) || !Number.isFinite(Date.parse(s)))
      return fail('Invalid timestamp.');
    return s;
  };
  const licence: Licence = {
    id: identifier(l.id),
    expression: text(l.expression, 120),
    sourceUrl: httpsUrl(l.sourceUrl),
    text: text(l.text, 50000, true),
    commercial: permission(l.commercial),
    redistribution: permission(l.redistribution),
    attribution: l.attribution === true,
    checkedAt: timestamp(l.checkedAt),
    note: text(l.note, 2000, true),
  };
  if (
    (licence.commercial === 'allowed' || licence.redistribution === 'allowed') &&
    (!licence.text || !licence.checkedAt)
  )
    return fail('Licence permissions require retained evidence and a check date.');
  const preview = a.preview ? record(a.preview) : null;
  const assetId = identifier(a.id),
    providerId = identifier(a.providerId);
  if (!assetId.startsWith(providerId + '/'))
    return fail('Asset identifiers must belong to their provider.');
  const variantIds = variants.map((v) => identifier(record(v).id));
  if (
    new Set(variantIds).size !== variantIds.length ||
    variantIds.some((id) => !id.startsWith(assetId + '/'))
  )
    return fail('Variant identifiers must be unique and belong to the asset.');
  return {
    id: identifier(a.id),
    providerId: identifier(a.providerId),
    slug: identifier(a.slug),
    name: text(a.name, 150),
    description: text(a.description, 1600),
    kind: choice(text(a.kind, 40), [
      'component',
      'icon',
      'icon-pack',
      'font',
      'template',
    ]) as Asset['kind'],
    category:
      a.kind === 'component'
        ? a.providerId === 'simply-buttons'
          ? 'buttons'
          : componentCategory(text(a.slug, 180))
        : '',
    tags: strings(a.tags),
    price: choice(a.price, ['free', 'paid', 'unknown'], 'unknown') as Asset['price'],
    sourceUrl: httpsUrl(a.sourceUrl),
    licence,
    variants: variants.map((v) => {
      const x = record(v),
        ac = record(x.acquisition),
        peers = record(x.peerDependencies ?? {});
      if (Object.keys(peers).length > 30) return fail('Too many peer dependencies.');
      return {
        id: identifier(x.id),
        framework: choice(text(x.framework, 40), ['react', 'vue', 'html', 'agnostic']),
        format: choice(text(x.format, 40), ['tsx', 'jsx', 'svg', 'css', 'woff2']),
        css: x.css ? text(x.css, 80) : null,
        dependencies: strings(x.dependencies ?? []),
        registryDependencies: strings(x.registryDependencies ?? []),
        peerDependencies: Object.fromEntries(
          Object.entries(peers).map(([key, value]) => [text(key, 100), text(value, 200)]),
        ),
        sourceRef: x.sourceRef ? text(x.sourceRef, 100) : null,
        acquisition: {
          kind: choice(text(ac.kind, 40), [
            'registry',
            'package',
            'direct',
            'external',
            'purchase',
          ]) as Variant['acquisition']['kind'],
          url: httpsUrl(ac.url),
          ...(ac.packageName ? { packageName: text(ac.packageName, 150) } : {}),
        },
      };
    }),
    evidence: evidence.map((e) => {
      const x = record(e);
      return {
        field: text(x.field, 80),
        url: httpsUrl(x.url),
        reference: x.reference ? text(x.reference, 120) : null,
        observedAt: timestamp(x.observedAt) ?? fail('Evidence requires a date.'),
        method: choice(text(x.method, 40), [
          'declared',
          'inferred',
          'inspected',
        ]) as Evidence['method'],
      };
    }),
    preview: preview
      ? {
          kind: choice(text(preview.kind, 40), ['image']) as 'image',
          url: httpsUrl(preview.url),
          label: text(preview.label, 200),
        }
      : null,
    verifiedAt: timestamp(a.verifiedAt),
    editorialPick: false,
  };
}
export function fingerprint(asset: Asset): string {
  // Check timestamps do not create an endless stream of identical revisions.
  const stable = {
    ...asset,
    verifiedAt: null,
    editorialPick: false,
    licence: { ...asset.licence, checkedAt: null },
    evidence: asset.evidence.map((e) => ({ ...e, observedAt: null })),
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}
export function parseScout(input: unknown) {
  const data = record(input);
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100)
    return fail('Supply 1 to 100 scout items.');
  return data.items.map((entry) => {
    const x = record(entry);
    return {
      name: text(x.name, 150, true) || new URL(httpsUrl(x.url)).hostname,
      url: canonicalUrl(x.url),
      postUrl: x.postUrl ? httpsUrl(x.postUrl) : null,
      creator: text(x.creator, 150, true),
      note: text(x.note ?? x.why, 2000, true),
      collectedAt: x.collectedAt
        ? Number.isFinite(Date.parse(text(x.collectedAt, 40)))
          ? new Date(String(x.collectedAt)).toISOString()
          : fail('Invalid collection timestamp.')
        : null,
      source: text(x.source, 200, true) || 'grok-x',
      sourceChannel: 'grok-x',
    };
  });
}
