import { createHash } from 'node:crypto';
import { type Asset, type Licence, type Provider, RegistryError, record, text } from './domain.ts';
import { FetchBudget } from './fetcher.ts';

export const PROVIDERS: Provider[] = [
  {
    id: 'shadcn',
    name: 'shadcn/ui',
    url: 'https://ui.shadcn.com/',
    repo: 'shadcn-ui/ui',
    branch: 'main',
    licencePath: 'LICENSE.md',
    adapter: 'shadcn-registry',
    registryPath: 'apps/v4/registry/new-york-v4/ui/_registry.ts',
    registryBaseUrl: 'https://ui.shadcn.com/r/styles/new-york-v4/',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-12T05:41:00.000Z',
    rationale:
      'An existing UIXO-selected source. Transparent component source and a first-party installation registry; dependencies stay visible.',
  },
  {
    id: 'lucide',
    name: 'Lucide',
    url: 'https://lucide.dev/',
    repo: 'lucide-icons/lucide',
    branch: 'main',
    licencePath: 'LICENSE',
    adapter: 'github-icons',
    approved: true,
    selectedAt: '2026-09-12T05:41:00.000Z',
    rationale:
      'An existing UIXO-selected source. Consistent outline icons with retained ISC and inherited Feather MIT notices.',
  },
  {
    id: 'heroicons',
    name: 'Heroicons',
    url: 'https://heroicons.com/',
    repo: 'tailwindlabs/heroicons',
    branch: 'master',
    licencePath: 'LICENSE',
    adapter: 'github-icons',
    approved: true,
    selectedAt: '2026-09-12T05:41:00.000Z',
    rationale:
      'Selected for the implementation as an additional provider, not a change to the editorial directory. First-party SVG sources and React packages with an explicit MIT licence.',
  },
  {
    id: 'magic-ui',
    name: 'Magic UI',
    url: 'https://magicui.design/',
    repo: 'magicuidesign/magicui',
    branch: 'main',
    licencePath: 'LICENSE.md',
    adapter: 'github-json-registry',
    registryPath: 'registry.json',
    registryBaseUrl: 'https://magicui.design/r/',
    sourceRoot: 'apps/www',
    excludedComponents: [
      'script-copy-btn',
      'flip-text',
      'scratch-to-reveal',
      'box-reveal',
      'iphone-15-pro',
      'arc-timeline',
      'grid-beams',
    ],
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-14T00:00:00.000Z',
    rationale:
      'An existing UIXO-selected React source with an official component registry, declared dependencies, transparent source and an explicit MIT licence.',
  },
  {
    id: 'motion-primitives',
    name: 'Motion Primitives',
    url: 'https://motion-primitives.com/',
    repo: 'ibelick/motion-primitives',
    branch: 'main',
    licencePath: 'LICENCE.md',
    adapter: 'github-json-registry',
    registryPath: 'public/c/registry.json',
    registryBaseUrl: 'https://motion-primitives.com/c/',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-14T00:00:00.000Z',
    rationale:
      'An existing UIXO-selected React source with an official component registry, declared dependencies, transparent source and an explicit MIT licence.',
  },
];
export function licenceFromText(
  provider: Provider,
  body: string,
  sourceUrl: string,
  now: string,
): Licence {
  const restricted = /commons clause|non.commercial|all rights reserved|no redistribution/i.test(
    body,
  );
  const mit =
    /permission is hereby granted, free of charge/i.test(body) &&
    /copyright notice and this permission notice/i.test(body);
  const isc =
    /permission to use, copy, modify, and\/or distribute/i.test(body) &&
    /for any\s+purpose with or without fee/i.test(body);
  const recognised = !restricted && (mit || isc);
  return {
    id: `${provider.id}-${createHash('sha256').update(body).digest('hex').slice(0, 16)}`,
    expression: restricted
      ? 'Restricted / review required'
      : mit && isc
        ? 'ISC AND MIT (inherited icons)'
        : mit
          ? 'MIT'
          : isc
            ? 'ISC'
            : 'Unknown',
    sourceUrl,
    text: body,
    commercial: recognised ? 'allowed' : 'unknown',
    redistribution: recognised ? 'allowed' : 'unknown',
    attribution: recognised,
    checkedAt: now,
    note: 'Evidence covers the named upstream source, not all third-party dependencies or trademark rights. Retain every applicable notice. Runtime and installation routes are not certified by the licence check.',
  };
}
export function parseShadcnManifest(body: string) {
  // Extract declarative records only. Never evaluate, import or execute upstream TypeScript.
  const records = body.split(/(?=^[^\S\r\n]{2}\{\s*$)/m).flatMap((block) => {
    const name = /^[^\S\r\n]{4}name: "([a-z0-9-]+)"/m.exec(block)?.[1];
    if (!name) return [];
    const deps = /\n[^\S\r\n]{4}dependencies: \[([^\]]*)\]/m.exec(block)?.[1] ?? '';
    const registryDeps = /\n[^\S\r\n]{4}registryDependencies: \[([^\]]*)\]/m.exec(block)?.[1] ?? '';
    return [
      {
        name,
        dependencies: [...deps.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
        registryDependencies: [...registryDeps.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
      },
    ];
  });
  if (!records.length || records.length > 200)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Registry layout changed. Update and review the adapter.',
      502,
    );
  return records;
}

export type JsonRegistryComponent = {
  name: string;
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  categories: string[];
  sourcePath: string;
  format: 'tsx' | 'jsx';
};

export function parseJsonRegistry(body: string): JsonRegistryComponent[] {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new RegistryError('PROVIDER_FORMAT', 'Provider returned invalid registry JSON.', 502);
  }
  const manifest = record(value);
  if (!Array.isArray(manifest.items) || !manifest.items.length || manifest.items.length > 500)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Registry layout changed. Update and review the adapter.',
      502,
    );
  const components = manifest.items.flatMap((entry): JsonRegistryComponent[] => {
    const item = record(entry);
    if (!['registry:ui', 'registry:component'].includes(String(item.type))) return [];
    const name = text(item.name, 150);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
      throw new RegistryError('PROVIDER_FORMAT', 'Registry component name is invalid.', 502);
    if (!Array.isArray(item.files) || !item.files.length)
      throw new RegistryError('PROVIDER_FORMAT', 'Registry component has no source file.', 502);
    const paths = item.files.map((file) => text(record(file).path, 400));
    const sourcePath = paths.find((path) => /\.(tsx|jsx)$/.test(path));
    if (!sourcePath || sourcePath.includes('..') || sourcePath.startsWith('/'))
      throw new RegistryError('PROVIDER_FORMAT', 'Registry component source path is invalid.', 502);
    const dependencies = Array.isArray(item.dependencies)
      ? item.dependencies.map((dependency) => text(dependency, 150))
      : [];
    const registryDependencies = Array.isArray(item.registryDependencies)
      ? item.registryDependencies.map((dependency) => text(dependency, 150))
      : [];
    const categories = Array.isArray(item.categories)
      ? item.categories.map((category) => text(category, 80))
      : [];
    const title = item.title
      ? text(item.title, 150)
      : name.replace(
          /(^|-)(\w)/g,
          (_, separator: string, character: string) =>
            `${separator ? ' ' : ''}${character.toUpperCase()}`,
        );
    return [
      {
        name,
        title,
        description: item.description ? text(item.description, 1600) : `${title} component.`,
        dependencies: [...new Set(dependencies)],
        registryDependencies: [...new Set(registryDependencies)],
        categories: [...new Set(categories)],
        sourcePath,
        format: sourcePath.endsWith('.jsx') ? 'jsx' : 'tsx',
      },
    ];
  });
  if (!components.length || components.length > 200)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Registry contains no supported component records.',
      502,
    );
  if (new Set(components.map((component) => component.name)).size !== components.length)
    throw new RegistryError('PROVIDER_FORMAT', 'Registry component names must be unique.', 502);
  return components;
}
export function componentAsset(
  name: string,
  dependencies: string[],
  provider: Provider,
  licence: Licence,
  ref: string,
  now: string,
): Asset {
  const sourceUrl = `https://github.com/${provider.repo}/blob/${ref}/apps/v4/registry/new-york-v4/ui/${name}.tsx`;
  const navigation = /sidebar|menu|breadcrumb|pagination|tabs|command/.test(name);
  return {
    id: `${provider.id}/${name}`,
    providerId: provider.id,
    slug: name,
    name: name.replace(
      /(^|-)(\w)/g,
      (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`,
    ),
    description: `The ${name.replace(/-/g, ' ')} component from shadcn/ui. Inspect the upstream implementation and its dependencies before adding it to your project.`,
    kind: 'component',
    tags: [
      'interface',
      'minimal',
      'light',
      'dark',
      'tailwind',
      ...(navigation ? ['navigation', 'dashboard'] : ['forms', 'layout']),
    ],
    price: 'free',
    sourceUrl,
    licence,
    variants: [
      {
        id: `${provider.id}/${name}/react`,
        framework: 'react',
        format: 'tsx',
        css: 'tailwind',
        dependencies,
        peerDependencies: {},
        sourceRef: ref,
        acquisition: {
          kind: 'registry',
          url: `https://ui.shadcn.com/r/styles/new-york-v4/${name}.json`,
        },
      },
    ],
    evidence: [
      {
        field: 'component and declared dependencies',
        url: `https://github.com/${provider.repo}/blob/${ref}/apps/v4/registry/new-york-v4/ui/_registry.ts`,
        reference: ref,
        observedAt: now,
        method: 'declared',
      },
    ],
    verifiedAt: now,
    preview: {
      kind: 'image',
      url: `https://uixo-brown.vercel.app/assets/component-previews/${provider.id}/${name}.webp`,
      label: `Captured from the official ${provider.name} documentation demo.`,
    },
    editorialPick: false,
  };
}

export function jsonRegistryComponentAsset(
  item: JsonRegistryComponent,
  provider: Provider,
  licence: Licence,
  ref: string,
  now: string,
): Asset {
  if (!provider.registryPath || !provider.registryBaseUrl)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Provider registry configuration is incomplete.',
      502,
    );
  const repositoryPath = provider.sourceRoot
    ? `${provider.sourceRoot}/${item.sourcePath}`
    : item.sourcePath;
  const sourceUrl = `https://github.com/${provider.repo}/blob/${ref}/${repositoryPath}`;
  const manifestUrl = `https://github.com/${provider.repo}/blob/${ref}/${provider.registryPath}`;
  return {
    id: `${provider.id}/${item.name}`,
    providerId: provider.id,
    slug: item.name,
    name: item.title,
    description: item.description,
    kind: 'component',
    tags: [
      'interface',
      'react',
      ...(provider.css ? [provider.css] : []),
      ...item.categories.map((category) => category.toLowerCase()),
    ],
    price: licence.commercial === 'allowed' ? 'free' : 'unknown',
    sourceUrl,
    licence,
    variants: [
      {
        id: `${provider.id}/${item.name}/react`,
        framework: 'react',
        format: item.format,
        css: provider.css ?? null,
        dependencies: item.dependencies,
        registryDependencies: item.registryDependencies,
        peerDependencies: {},
        sourceRef: ref,
        acquisition: {
          kind: 'registry',
          url: `${provider.registryBaseUrl}${encodeURIComponent(item.name)}.json`,
        },
      },
    ],
    evidence: [
      {
        field: 'component metadata and declared dependencies',
        url: manifestUrl,
        reference: ref,
        observedAt: now,
        method: 'declared',
      },
      {
        field: 'component source path',
        url: sourceUrl,
        reference: ref,
        observedAt: now,
        method: 'declared',
      },
    ],
    verifiedAt: now,
    preview: {
      kind: 'image',
      url: `https://uixo-brown.vercel.app/assets/component-previews/${provider.id}/${item.name}.webp`,
      label: `Captured from the official ${provider.name} documentation demo.`,
    },
    editorialPick: false,
  };
}
export function iconAsset(
  provider: Provider,
  path: string,
  ref: string,
  licence: Licence,
  now: string,
): Asset {
  const name = path.split('/').pop()!.replace('.svg', ''),
    suffix = provider.id === 'heroicons' ? '24-outline' : 'outline';
  const id = `${provider.id}/${name}`,
    raw = `https://raw.githubusercontent.com/${provider.repo}/${ref}/${path}`;
  return {
    id,
    providerId: provider.id,
    slug: name,
    name: name.replace(
      /(^|-)(\w)/g,
      (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`,
    ),
    description: `${name.replace(/-/g, ' ')} from ${provider.name}. A scalable ${suffix} icon; retrieve its SVG or use the provider's React package.`,
    kind: 'icon',
    tags: ['outline', 'minimal', 'interface', 'icon', ...name.split('-')],
    price: 'free',
    sourceUrl: `https://github.com/${provider.repo}/blob/${ref}/${path}`,
    licence,
    variants: [
      {
        id: `${id}/svg`,
        framework: 'agnostic',
        format: 'svg',
        css: null,
        dependencies: [],
        peerDependencies: {},
        sourceRef: ref,
        acquisition: { kind: 'direct', url: raw },
      },
      {
        id: `${id}/react`,
        framework: 'react',
        format: 'tsx',
        css: null,
        dependencies: [],
        peerDependencies: {},
        sourceRef: null,
        acquisition: {
          kind: 'package',
          packageName: provider.id === 'lucide' ? 'lucide-react' : '@heroicons/react',
          url: provider.url,
        },
      },
    ],
    evidence: [
      {
        field: 'upstream SVG source',
        url: `https://github.com/${provider.repo}/blob/${ref}/${path}`,
        reference: ref,
        observedAt: now,
        method: 'inspected',
      },
    ],
    verifiedAt: now,
    preview: {
      kind: 'image',
      url: raw,
      label: `Original ${provider.name} SVG. Upstream copyright and licence apply.`,
    },
    editorialPick: false,
  };
}
export type IndexPage = {
  assets: Asset[];
  nextOffset: number | null;
  sourceRef: string;
  total: number;
  offset: number;
};
export async function indexPage(
  providerId: string,
  options: { offset?: number; sourceRef?: string | null } = {},
  budget = new FetchBudget(),
): Promise<IndexPage> {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider?.approved)
    throw new RegistryError('PROVIDER_NOT_APPROVED', 'Choose an approved provider adapter.', 403);
  const offset = options.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
    throw new RegistryError('INVALID_INPUT', 'Invalid provider offset.');
  const now = new Date().toISOString(),
    base = `https://api.github.com/repos/${provider.repo}`;
  let ref = options.sourceRef;
  if (!ref) {
    const refPayload = record(await budget.json(`${base}/git/refs/heads/${provider.branch}`));
    ref = text(record(refPayload.object).sha, 40);
  }
  if (!/^[a-f0-9]{40}$/.test(ref))
    throw new RegistryError('PROVIDER_FORMAT', 'Expected an immutable Git commit.', 502);
  const licencePath = provider.licencePath;
  const body = await budget.text(
    `https://raw.githubusercontent.com/${provider.repo}/${ref}/${licencePath}`,
  );
  const licence = licenceFromText(
    provider,
    body,
    `https://github.com/${provider.repo}/blob/${ref}/${licencePath}`,
    now,
  );
  let all: Asset[];
  if (provider.adapter === 'shadcn-registry') {
    const manifest = await budget.text(
      `https://raw.githubusercontent.com/${provider.repo}/${ref}/apps/v4/registry/new-york-v4/ui/_registry.ts`,
    );
    all = parseShadcnManifest(manifest).map((item) => {
      const asset = componentAsset(item.name, item.dependencies, provider, licence, ref!, now);
      asset.variants[0].registryDependencies = item.registryDependencies;
      asset.evidence.push({
        field: 'registry dependency declarations',
        url: asset.evidence[0].url,
        reference: ref!,
        observedAt: now,
        method: 'declared',
      });
      return asset;
    });
  } else if (provider.adapter === 'github-json-registry') {
    if (!provider.registryPath)
      throw new RegistryError('PROVIDER_FORMAT', 'Provider registry path is missing.', 502);
    const manifest = await budget.text(
      `https://raw.githubusercontent.com/${provider.repo}/${ref}/${provider.registryPath}`,
    );
    all = parseJsonRegistry(manifest)
      .filter((item) => !provider.excludedComponents?.includes(item.name))
      .map((item) => jsonRegistryComponentAsset(item, provider, licence, ref!, now));
  } else {
    const tree = record(await budget.json(`${base}/git/trees/${ref}?recursive=1`));
    if (tree.truncated === true || !Array.isArray(tree.tree))
      throw new RegistryError(
        'PROVIDER_FORMAT',
        'Incomplete upstream tree; refusing a misleading index.',
        502,
      );
    const pattern =
      provider.id === 'lucide'
        ? /^icons\/[a-z0-9-]+\.svg$/
        : /^optimized\/24\/outline\/[a-z0-9-]+\.svg$/;
    // Sort before slicing: stable pages retain one immutable source revision.
    const paths = tree.tree
      .map(record)
      .filter(
        (entry) =>
          entry.type === 'blob' && typeof entry.path === 'string' && pattern.test(entry.path),
      )
      .map((entry) => String(entry.path))
      .sort();
    const assets = paths
      .slice(offset, offset + 200)
      .map((path) => iconAsset(provider, path, ref!, licence, now));
    return {
      assets,
      total: paths.length,
      offset,
      nextOffset: offset + assets.length < paths.length ? offset + assets.length : null,
      sourceRef: ref,
    };
  }
  all.sort((a, b) => a.id.localeCompare(b.id));
  const assets = all.slice(offset, offset + 200);
  return {
    assets,
    total: all.length,
    offset,
    nextOffset: offset + assets.length < all.length ? offset + assets.length : null,
    sourceRef: ref,
  };
}
export async function indexProvider(
  providerId: string,
  budget = new FetchBudget(),
): Promise<Asset[]> {
  return (await indexPage(providerId, {}, budget)).assets;
}
