import { auth } from './auth';

/** Browser-only registry contract. Never import the Node registry runtime into the UI. */
export type AssetRecord = {
  id: string;
  providerId: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  price: string;
  tags: string[];
  sourceUrl: string;
  verifiedAt: string | null;
  editorialPick?: boolean;
  evidence?: {
    field: string;
    url: string;
    method: string;
    observedAt: string;
    reference: string | null;
  }[];
  preview: { kind: string; url?: string; label: string } | null;
  licence: {
    expression: string;
    commercial: string;
    redistribution: string;
    sourceUrl: string;
    note: string;
    text?: string;
  };
  variants: {
    id: string;
    framework: string;
    format: string;
    dependencies: string[];
    css: string | null;
    registryDependencies?: string[];
    peerDependencies?: Record<string, string>;
    sourceRef?: string | null;
  }[];
};
export type ProviderRecord = {
  id: string;
  name: string;
  url: string;
  rationale: string;
  assetCount: number;
  adapter?: string;
};
export type Catalogue = { items: AssetRecord[]; total: number; nextOffset: number | null };
export type RegistryStatus = {
  storage: string;
  readOnly: boolean;
  stats: { assets: number; providers: number; pending?: number; discoveries?: number };
  role: string;
  eveConfigured?: boolean;
  searchMode?: string;
};
export type Acquisition = {
  status: string;
  message: string;
  url: string;
  command: { executable: string; arguments: string[] } | null;
  executed: boolean;
};
export const ASSET_PATH = '/browse/assets';
export { ASSET_SAVES_KEY as ASSET_SAVES, parseSavedAssets } from './asset-saves';
export type AssetQuery = {
  q: string;
  kind: string;
  provider: string;
  framework: string;
  format: string;
  commercial: boolean;
  price: string;
  offset: number;
  view: 'assets' | 'saved' | 'sources' | 'connect' | 'guide' | 'review' | 'scout' | 'jobs';
  id: string;
};
export const EMPTY_ASSET_QUERY: AssetQuery = {
  q: '',
  kind: '',
  provider: '',
  framework: '',
  format: '',
  commercial: false,
  price: '',
  offset: 0,
  view: 'assets',
  id: '',
};
const valid = (value: string | null, options: string[]) =>
  value && options.includes(value) ? value : '';
export function readAssetQuery(search: string): AssetQuery {
  const p = new URLSearchParams(search);
  const offset = Number(p.get('offset'));
  return {
    q: (p.get('q') ?? '').slice(0, 300),
    kind: valid(p.get('kind'), ['component', 'icon', 'font', 'template']),
    provider: /^[a-z0-9-]{1,80}$/.test(p.get('provider') ?? '') ? p.get('provider')! : '',
    framework: valid(p.get('framework'), ['react', 'vue', 'html', 'agnostic']),
    format: valid(p.get('format'), ['tsx', 'jsx', 'svg', 'css', 'woff2']),
    commercial: p.get('commercial') === 'true',
    price: valid(p.get('price'), ['free', 'paid', 'unknown']),
    offset: Number.isSafeInteger(offset) && offset >= 0 && offset <= 100000 ? offset : 0,
    view: (valid(p.get('view'), [
      'assets',
      'saved',
      'sources',
      'connect',
      'guide',
      'review',
      'scout',
      'jobs',
    ]) || 'assets') as AssetQuery['view'],
    id:
      /^[a-z0-9][a-z0-9._/-]{0,179}$/.test(p.get('id') ?? '') && !p.get('id')!.includes('..')
        ? p.get('id')!
        : '',
  };
}
export function assetHref(query: AssetQuery): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === false || value === 0 || (key === 'view' && value === 'assets'))
      continue;
    p.set(key, String(value));
  }
  return ASSET_PATH + (p.size ? `?${p}` : '');
}
export function safeAssetUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function catalogueResult(value: unknown): Catalogue {
  const result = value as Partial<Catalogue> | null;
  if (
    !result ||
    !Array.isArray(result.items) ||
    !Number.isSafeInteger(result.total) ||
    result.total! < 0 ||
    (result.nextOffset !== null && !Number.isSafeInteger(result.nextOffset))
  ) {
    throw new Error(
      'The registry returned an invalid catalogue. This is a service problem, not an empty library.',
    );
  }
  for (const item of result.items) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !Array.isArray(item.variants) ||
      !item.licence
    )
      throw new Error('An asset record is incomplete. Please report this registry response.');
  }
  return result as Catalogue;
}
export async function registryRequest<T>(
  action: string,
  options: {
    query?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
    authenticated?: boolean;
  } = {},
): Promise<T> {
  const parameters = new URLSearchParams({ action, ...options.query });
  const token = options.authenticated ? await auth.apiToken() : null;
  const headers = new Headers();
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`/api/registry?${parameters}`, {
    method: options.body === undefined ? 'GET' : 'POST',
    signal: options.signal,
    credentials: 'same-origin',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!isJson)
    throw new Error(
      `The registry API returned ${response.status} without JSON. Check that the API is running and that the deployment routes /api/registry to its function.`,
    );
  let result: T & { error?: { code?: string; message?: string } };
  try {
    result = await response.json();
  } catch {
    throw new Error('The registry returned invalid JSON. Check the API runtime.');
  }
  if (!result || typeof result !== 'object')
    throw new Error('The registry returned an invalid response.');
  if (!response.ok || result.error)
    throw new Error(result.error?.message ?? `Registry request failed (${response.status}).`);
  return result;
}
