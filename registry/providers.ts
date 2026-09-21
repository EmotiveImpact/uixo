import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { componentCategory } from '../shared/component-categories.ts';
import { type Asset, type Licence, type Provider, RegistryError, record, text } from './domain.ts';
import { FetchBudget } from './fetcher.ts';
import { readAnimataSnapshot } from './animata.ts';

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
  {
    id: 'simply-buttons',
    name: 'Simply Buttons',
    url: 'https://simply-buttons.vercel.app/',
    repo: 'bits933/simply-buttons',
    branch: 'main',
    licencePath: 'README.md',
    adapter: 'reviewed-gallery',
    approved: true,
    selectedAt: '2026-09-14T00:00:00.000Z',
    rationale:
      'User-selected button gallery. Original self-contained React demos are reviewed and pinned individually; README reuse guidance is retained without claiming a standard licence.',
  },
  {
    id: 'animata',
    name: 'Animata',
    url: 'https://animata.design/',
    repo: 'codse/animata',
    branch: 'main',
    licencePath: 'LICENSE.md',
    adapter: 'github-storybook',
    registryBaseUrl: 'https://animata.design/preview/?path=/story/',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-20T00:00:00.000Z',
    rationale:
      'Official open-source React component collection with an MIT licence, pinned upstream source files, and provider-hosted Storybook demos for each catalogued component.',
  },
  {
    id: 'uiable',
    name: 'UIAble',
    url: 'https://uiable.com/',
    repo: 'codedthemes/uiable',
    branch: 'master',
    licencePath: 'LICENSE',
    adapter: 'reviewed-snapshot',
    registryBaseUrl: 'https://uiable.com/r/',
    sourceRef: '34e78586c904091059deb63412ae330b2757e923',
    snapshotPath:
      'data/registry/snapshots/ingestion/uiable/34e78586c904091059deb63412ae330b2757e923/staged.json',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-21T00:00:00.000Z',
    rationale:
      "First-party MIT component registry pinned to an immutable commit. UIXO uses each component's exact source path, declared dependencies, official registry install URL and exact first-party isolated preview route.",
  },
  {
    id: 'flowbite-react',
    name: 'Flowbite React',
    url: 'https://flowbite-react.com/',
    repo: 'themesberg/flowbite-react',
    branch: 'main',
    licencePath: 'LICENSE',
    adapter: 'reviewed-snapshot',
    sourceRef: '85319bd067822f7aa9670688780aeb58cc187aa5',
    snapshotPath:
      'data/registry/snapshots/ingestion/flowbite-react/85319bd067822f7aa9670688780aeb58cc187aa5/staged.json',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-21T00:00:00.000Z',
    rationale:
      'Official MIT React package pinned to an immutable commit. UIXO publishes only components with a unique first-party isolated example route and retains package peer-dependency evidence.',
  },
  {
    id: 'heroui-web',
    name: 'HeroUI Web',
    url: 'https://www.heroui.com/',
    repo: 'heroui-inc/heroui',
    branch: 'v3',
    licencePath: 'LICENSE',
    adapter: 'reviewed-snapshot',
    sourceRef: 'ac71b5f644803b2107c878908e64f100d6a7d443',
    snapshotPath:
      'data/registry/snapshots/ingestion/heroui-web/ac71b5f644803b2107c878908e64f100d6a7d443/staged.json',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-21T00:00:00.000Z',
    rationale:
      'Official HeroUI v3 web package pinned after the documented Apache-2.0 relicensing. Preview IDs are derived from the retained pinned Storybook source rather than guessed from component names.',
  },
  {
    id: 'babelize-elements',
    name: 'Babelize Elements',
    url: 'https://elements.babelize.co/',
    repo: 'babelize/babelize-elements',
    branch: 'main',
    licencePath: 'LICENSE',
    adapter: 'reviewed-snapshot',
    registryBaseUrl: 'https://elements.babelize.co/r/',
    sourceRef: '2cd92ba8acad36e6122d4c528cc81b5d99ffd587',
    snapshotPath: 'data/registry/snapshots/babelize-elements-reviewed.json',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-21T00:00:00.000Z',
    rationale:
      'Official MIT Babelize registry pinned to an immutable commit. UIXO renders the exact first-party demo source locally in the sandboxed preview runner and preserves the provider registry dependencies.',
  },
  {
    id: 'tailark',
    name: 'Tailark',
    url: 'https://tailark.com/',
    repo: 'tailark/blocks',
    branch: 'main',
    licencePath: 'LICENCE.md',
    adapter: 'reviewed-snapshot',
    registryBaseUrl: 'https://tailark.com/r/',
    sourceRef: '8139698115c1341bfd2e3e286c04bb4d8146f472',
    snapshotPath: 'data/registry/snapshots/tailark-reviewed.json',
    css: 'tailwind',
    approved: true,
    selectedAt: '2026-09-21T00:00:00.000Z',
    rationale:
      'Official MIT Tailark block registry pinned to an immutable commit. UIXO publishes one logical Base block per official public installer and isolated view route; Radix alternatives remain retained but unpublished to avoid duplicate identities.',
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
  const apache =
    /Apache License\s+Version 2\.0/i.test(body) &&
    /Grant of Copyright License/i.test(body) &&
    /Redistribution/i.test(body);
  const recognised = !restricted && (mit || isc || apache);
  return {
    id: `${provider.id}-${createHash('sha256').update(body).digest('hex').slice(0, 16)}`,
    expression: restricted
      ? 'Restricted / review required'
      : mit && isc
        ? 'ISC AND MIT (inherited icons)'
        : apache
          ? 'Apache-2.0'
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
    preview: null,
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
    preview: null,
    editorialPick: false,
  };
}

export type StorybookSnapshotItem = {
  path: string;
  category: string;
  slug: string;
  name: string;
  storyId: string;
};

const ANIMATA_CATEGORY_MAP: Record<string, string> = {
  accordion: 'layout',
  background: 'backgrounds',
  'bento-grid': 'layout',
  button: 'buttons',
  card: 'layout',
  carousel: 'media',
  container: 'layout',
  fabs: 'buttons',
  'feature-cards': 'layout',
  graphs: 'data-display',
  hero: 'layout',
  icon: 'media',
  image: 'media',
  list: 'layout',
  overlay: 'overlays',
  preloader: 'feedback',
  progress: 'feedback',
  scroll: 'navigation',
  section: 'layout',
  skeleton: 'feedback',
  tabs: 'navigation',
  text: 'text',
  widget: 'other',
};

export function storybookComponentAsset(
  item: StorybookSnapshotItem,
  provider: Provider,
  licence: Licence,
  ref: string,
  now: string,
): Asset {
  const sourceUrl = `https://github.com/${provider.repo}/blob/${ref}/${item.path}`;
  const category = ANIMATA_CATEGORY_MAP[item.category] ?? componentCategory(item.slug);
  const storyUrl = `https://animata.design/preview/?path=/story/${item.storyId}`;
  const slug = `${item.category}-${item.slug}`.toLowerCase();
  return {
    id: `${provider.id}/${slug}`,
    providerId: provider.id,
    slug,
    name: item.name,
    description: `${item.name} is an Animata ${item.category.replace(/-/g, ' ')} component. Preview the original implementation, then inspect its pinned upstream source before using it.`,
    kind: 'component',
    category,
    tags: ['interface', 'react', 'tailwind', category, item.category, 'category:' + category],
    price: licence.commercial === 'allowed' ? 'free' : 'unknown',
    sourceUrl,
    licence,
    variants: [
      {
        id: `${provider.id}/${slug}/react`,
        framework: 'react',
        format: 'tsx',
        css: provider.css ?? null,
        dependencies: [],
        peerDependencies: {},
        sourceRef: ref,
        acquisition: { kind: 'external', url: sourceUrl },
      },
    ],
    evidence: [
      {
        field: 'pinned upstream component source',
        url: sourceUrl,
        reference: ref,
        observedAt: now,
        method: 'inspected',
      },
      {
        field: 'official provider Storybook demonstration',
        url: storyUrl,
        reference: item.storyId,
        observedAt: now,
        method: 'declared',
      },
    ],
    verifiedAt: now,
    preview: {
      kind: 'embed',
      url: `https://animata.design/preview/iframe?id=${encodeURIComponent(item.storyId)}&viewMode=story`,
      label: 'Official live Animata Storybook demo. The demonstration is hosted by Animata.',
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
/** One catalogue entry per icon library; individual glyphs stay at the source. */
export function iconPackAsset(
  provider: Provider,
  ref: string,
  licence: Licence,
  now: string,
): Asset {
  return {
    id: `${provider.id}/pack`,
    providerId: provider.id,
    slug: 'pack',
    name: `${provider.name} icon pack`,
    kind: 'icon-pack',
    description: `Browse the complete ${provider.name} icon library on its official site. Choose individual icons there or install the React package.`,
    tags: ['icons', 'icon pack', 'outline', 'svg', 'react'],
    price: 'free',
    sourceUrl: provider.url,
    licence,
    verifiedAt: now,
    editorialPick: false,
    preview: null,
    variants: [
      {
        id: `${provider.id}/pack/browse`,
        framework: 'agnostic',
        format: 'svg',
        css: null,
        dependencies: [],
        peerDependencies: {},
        sourceRef: ref,
        acquisition: { kind: 'external', url: provider.url },
      },
      {
        id: `${provider.id}/pack/react`,
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
        field: 'icon library source and licence',
        url: `https://github.com/${provider.repo}/tree/${ref}`,
        reference: ref,
        observedAt: now,
        method: 'declared',
      },
    ],
  };
}

type ReviewedSnapshotItem = {
  id: string;
  providerId: string;
  slug: string;
  name: string;
  description: string | null;
  kind: 'component';
  platform: 'web';
  categorySuggestion: string;
  providerTags: string[];
  sourceRef: string;
  sourceUrl: string;
  sourcePath: string;
  missingSourceFiles: string[];
  dependencies: string[] | null;
  registryDependencies: string[] | null;
  inventoryEvidence: { path: string; url: string };
  upstreamMetadata: Record<string, unknown>;
  preview: null;
  status: 'unpublished';
};

type ReviewedSnapshot = {
  providerId: string;
  sourceRef: string;
  observedAt: string;
  inventoryCount: number;
  items: ReviewedSnapshotItem[];
};

const FLOWBITE_PREVIEWS: Record<string, string> = {
  accordion: 'accordion.root',
  alert: 'alert.root',
  avatar: 'avatar.root',
  badge: 'badge.root',
  banner: 'banner.root',
  blockquote: 'blockquote.root',
  breadcrumb: 'breadcrumb.root',
  button: 'button.root',
  'button-group': 'buttonGroup.root',
  card: 'card.root',
  carousel: 'carousel.root',
  checkbox: 'forms.checkbox',
  clipboard: 'clipboard.root',
  datepicker: 'datepicker.root',
  drawer: 'drawer.root',
  dropdown: 'dropdown.root',
  'file-input': 'fileInput.root',
  'floating-label': 'floatingLabel.root',
  footer: 'footer.root',
  hr: 'hr.root',
  'helper-text': 'forms.helperText',
  kbd: 'kbd.root',
  label: 'forms.root',
  list: 'list.root',
  'list-group': 'listGroup.root',
  'mega-menu': 'megaMenu.root',
  modal: 'modal.root',
  navbar: 'navbar.root',
  pagination: 'pagination.root',
  popover: 'popover.root',
  progress: 'progress.root',
  radio: 'forms.radioButton',
  'range-slider': 'forms.rangeSlider',
  rating: 'rating.root',
  select: 'forms.select',
  sidebar: 'sidebar.root',
  spinner: 'spinner.root',
  table: 'table.root',
  tabs: 'tabs.root',
  'text-input': 'forms.inputSizing',
  textarea: 'forms.textarea',
  timeline: 'timeline.root',
  toast: 'toast.root',
  'toggle-switch': 'forms.toggleSwitch',
  tooltip: 'tooltip.root',
};

function reviewedStringArray(value: unknown, required: boolean): string[] {
  if (value === null || value === undefined) {
    if (required)
      throw new RegistryError(
        'PROVIDER_FORMAT',
        'Reviewed dependency evidence is incomplete.',
        502,
      );
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.length > 80 ||
    value.some((entry) => typeof entry !== 'string')
  )
    throw new RegistryError('PROVIDER_FORMAT', 'Reviewed dependency evidence is invalid.', 502);
  return [...new Set(value as string[])];
}

function reviewedPeerDependencies(item: ReviewedSnapshotItem): Record<string, string> {
  const metadata = record(item.upstreamMetadata);
  const pkg = metadata.package ? record(metadata.package) : {};
  const peers = pkg.peerDependencies ? record(pkg.peerDependencies) : {};
  if (Object.keys(peers).length > 30)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed package has too many peer dependencies.',
      502,
    );
  return Object.fromEntries(
    Object.entries(peers).map(([name, range]) => [text(name, 100), text(range, 200)]),
  );
}

function uiablePreview(sourcePath: string): string {
  const prefix = 'src/components/uiable/';
  if (!sourcePath.startsWith(prefix) || !/\.(tsx|jsx)$/.test(sourcePath))
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'UIAble source path cannot map to its isolated preview.',
      502,
    );
  const parts = sourcePath
    .slice(prefix.length)
    .replace(/\.(tsx|jsx)$/, '')
    .split('/');
  if (parts.length >= 2 && parts.at(-1) === parts.at(-2)) parts.pop();
  if (!parts.length || parts.some((part) => !/^[a-z0-9-]+$/.test(part)))
    throw new RegistryError('PROVIDER_FORMAT', 'UIAble preview path is invalid.', 502);
  return `https://uiable.com/preview/${parts.join('/')}`;
}

function storybookIdPart(value: string): string {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[\\/\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!id) throw new RegistryError('PROVIDER_FORMAT', 'HeroUI Storybook identifier is empty.', 502);
  return id;
}

async function heroUiPreview(provider: Provider, item: ReviewedSnapshotItem): Promise<string> {
  if (!provider.snapshotPath)
    throw new RegistryError('PROVIDER_FORMAT', 'HeroUI snapshot path is missing.', 502);
  const metadata = record(item.upstreamMetadata);
  const storyPath = text(metadata.storyPath, 500);
  if (!/^packages\/react\/src\/components\/[a-z0-9-]+\/[a-z0-9-]+\.stories\.tsx$/.test(storyPath))
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'HeroUI story path is outside the reviewed component tree.',
      502,
    );
  const root = provider.snapshotPath.replace(/\/staged\.json$/, '');
  const story = await readFile(
    new URL(`../${root}/upstream/${storyPath}`, import.meta.url),
    'utf8',
  );
  const title = /\btitle:\s*["'`]([^"'`]+)["'`]/.exec(story)?.[1];
  const exports = [...story.matchAll(/\bexport\s+const\s+([A-Za-z][A-Za-z0-9_]*)\b/g)].map(
    (match) => match[1],
  );
  const storyName = exports.includes('Default') ? 'Default' : exports[0];
  if (!title || !storyName)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'HeroUI story lacks a static title or exported story.',
      502,
    );
  const id = `${storybookIdPart(title)}--${storybookIdPart(storyName)}`;
  return `https://storybook-v3.heroui.com/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
}

async function reviewedPreview(
  provider: Provider,
  item: ReviewedSnapshotItem,
): Promise<string | null> {
  if (provider.id === 'uiable') return uiablePreview(item.sourcePath);
  if (provider.id === 'flowbite-react') {
    const example = FLOWBITE_PREVIEWS[item.slug];
    return example ? `https://flowbite-react.com/examples/${example}` : null;
  }
  if (provider.id === 'heroui-web') return heroUiPreview(provider, item);
  throw new RegistryError(
    'PROVIDER_FORMAT',
    'No reviewed preview policy exists for this provider.',
    502,
  );
}

async function readReviewedSnapshot(provider: Provider): Promise<ReviewedSnapshot> {
  if (!provider.snapshotPath || !provider.sourceRef || !/^[a-f0-9]{40}$/.test(provider.sourceRef))
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed provider snapshot configuration is incomplete.',
      502,
    );
  const value = record(
    JSON.parse(await readFile(new URL(`../${provider.snapshotPath}`, import.meta.url), 'utf8')),
  );
  if (value.providerId !== provider.id || value.sourceRef !== provider.sourceRef)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed snapshot identity does not match provider configuration.',
      502,
    );
  if (!Array.isArray(value.items) || !value.items.length || value.items.length > 1200)
    throw new RegistryError('PROVIDER_FORMAT', 'Reviewed snapshot item bounds changed.', 502);
  if (Number(value.inventoryCount) !== value.items.length)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed snapshot inventory count does not match its items.',
      502,
    );
  const ids = new Set<string>();
  const items = value.items.map((entry): ReviewedSnapshotItem => {
    const item = record(entry);
    const slug = text(item.slug, 150);
    const id = text(item.id, 320);
    if (item.providerId !== provider.id || id !== `${provider.id}/${slug}` || ids.has(id))
      throw new RegistryError(
        'PROVIDER_FORMAT',
        'Reviewed snapshot asset identity is invalid or duplicated.',
        502,
      );
    ids.add(id);
    if (
      item.sourceRef !== provider.sourceRef ||
      item.status !== 'unpublished' ||
      item.preview !== null
    )
      throw new RegistryError(
        'PROVIDER_FORMAT',
        'Reviewed source capture was mutated after evidence collection.',
        502,
      );
    if (!Array.isArray(item.missingSourceFiles) || item.missingSourceFiles.length)
      throw new RegistryError(
        'PROVIDER_FORMAT',
        'Reviewed component has missing source files.',
        502,
      );
    const inventoryEvidence = record(item.inventoryEvidence);
    const upstreamMetadata = record(item.upstreamMetadata);
    return {
      id,
      providerId: provider.id,
      slug,
      name: text(item.name, 150),
      description: item.description ? text(item.description, 1600) : null,
      kind: 'component',
      platform: 'web',
      categorySuggestion: item.categorySuggestion
        ? text(item.categorySuggestion, 80)
        : componentCategory(slug),
      providerTags: reviewedStringArray(item.providerTags ?? [], false),
      sourceRef: provider.sourceRef!,
      sourceUrl: text(item.sourceUrl, 2048),
      sourcePath: text(item.sourcePath, 500),
      missingSourceFiles: [],
      dependencies:
        item.dependencies === null ? null : reviewedStringArray(item.dependencies, false),
      registryDependencies:
        item.registryDependencies === null
          ? null
          : reviewedStringArray(item.registryDependencies, false),
      inventoryEvidence: {
        path: text(inventoryEvidence.path, 500),
        url: text(inventoryEvidence.url, 2048),
      },
      upstreamMetadata,
      preview: null,
      status: 'unpublished',
    };
  });
  return {
    providerId: provider.id,
    sourceRef: provider.sourceRef,
    observedAt: text(value.observedAt, 50),
    inventoryCount: Number(value.inventoryCount),
    items,
  };
}

export async function reviewedSnapshotAssets(provider: Provider): Promise<Asset[]> {
  if (provider.adapter !== 'reviewed-snapshot' || !provider.sourceRef)
    throw new RegistryError('PROVIDER_FORMAT', 'Expected a reviewed snapshot provider.', 502);
  const snapshot = await readReviewedSnapshot(provider);
  const body = await readFile(
    new URL(`../data/registry/licences/${provider.id}/${provider.sourceRef}.txt`, import.meta.url),
    'utf8',
  );
  const licence = licenceFromText(
    provider,
    body,
    `https://github.com/${provider.repo}/blob/${provider.sourceRef}/${provider.licencePath}`,
    snapshot.observedAt,
  );
  if (licence.commercial !== 'allowed' || licence.redistribution !== 'allowed')
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed provider licence is not publishable.',
      502,
    );
  if (provider.id === 'heroui-web')
    licence.note +=
      ' HeroUI v3 release notes document the April 2026 relicensing to Apache-2.0; the retained repository root is the controlling reviewed licence evidence for this pinned source revision.';

  const assets: Asset[] = [];
  for (const item of snapshot.items) {
    const previewUrl = await reviewedPreview(provider, item);
    const hasPinnedLocalDemo =
      provider.id === 'babelize-elements' &&
      ['language-switcher', 'phone-input', 'navbar'].includes(item.slug);
    if (!previewUrl && !hasPinnedLocalDemo) continue;
    const packageProvider = provider.id === 'flowbite-react' || provider.id === 'heroui-web';
    const dependencies = packageProvider ? [] : reviewedStringArray(item.dependencies, true);
    const registryDependencies = packageProvider
      ? []
      : reviewedStringArray(item.registryDependencies, true);
    const packageName =
      provider.id === 'flowbite-react'
        ? 'flowbite-react'
        : provider.id === 'heroui-web'
          ? '@heroui/react'
          : undefined;
    const acquisition =
      provider.id === 'uiable'
        ? {
            kind: 'registry' as const,
            url: `https://uiable.com/r/${encodeURIComponent(item.slug)}.json`,
          }
        : provider.id === 'tailark'
          ? {
              kind: 'registry' as const,
              url: `https://tailark.com/r/${encodeURIComponent(item.slug)}.json`,
            }
          : provider.id === 'babelize-elements'
            ? {
                kind: 'registry' as const,
                url: `https://elements.babelize.co/r/${encodeURIComponent(item.slug)}.json`,
              }
            : {
                kind: 'package' as const,
                packageName: packageName!,
                url: provider.url,
              };
    const category = componentCategory(item.slug);
    assets.push({
      id: item.id,
      providerId: provider.id,
      slug: item.slug,
      name: item.name,
      description:
        item.description ??
        `${item.name} from ${provider.name}. Inspect the pinned upstream source and installation evidence before use.`,
      kind: 'component',
      category,
      tags: [
        'interface',
        'react',
        'tailwind',
        category,
        ...item.providerTags.map((tag) => tag.toLowerCase()),
      ],
      price: 'free',
      sourceUrl: item.sourceUrl,
      licence: { ...licence },
      variants: [
        {
          id: `${item.id}/react`,
          framework: 'react',
          format: item.sourcePath.endsWith('.jsx') ? 'jsx' : 'tsx',
          css: provider.css ?? null,
          dependencies,
          registryDependencies,
          peerDependencies: packageProvider ? reviewedPeerDependencies(item) : {},
          sourceRef: provider.sourceRef,
          acquisition,
        },
      ],
      evidence: [
        {
          field: 'pinned upstream component source',
          url: item.sourceUrl,
          reference: provider.sourceRef,
          observedAt: snapshot.observedAt,
          method: 'inspected',
        },
        {
          field: 'component inventory and installation metadata',
          url: item.inventoryEvidence.url,
          reference: provider.sourceRef,
          observedAt: snapshot.observedAt,
          method: 'declared',
        },
        {
          field: previewUrl
            ? 'official isolated component preview'
            : 'first-party demo source used for pinned local preview',
          url: previewUrl ?? text(record(item.upstreamMetadata).demoUrl, 2048),
          reference: provider.sourceRef,
          observedAt: snapshot.observedAt,
          method: previewUrl ? 'declared' : 'inspected',
        },
      ],
      verifiedAt: snapshot.observedAt,
      preview: previewUrl
        ? {
            kind: 'embed',
            url: previewUrl,
            label: `Official live ${provider.name} component demonstration.`,
          }
        : null,
      editorialPick: false,
    });
  }
  if (!assets.length)
    throw new RegistryError(
      'PROVIDER_FORMAT',
      'Reviewed provider has no truthfully previewable components.',
      502,
    );
  return assets.sort((a, b) => a.id.localeCompare(b.id));
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
  if (provider.adapter === 'reviewed-gallery')
    throw new RegistryError(
      'SOURCE_REVIEW_REQUIRED',
      'This gallery is ingested in source-reviewed batches with matching live demos. Update its pinned snapshot and verify before publishing.',
      409,
    );
  if (provider.adapter === 'reviewed-snapshot') {
    const all = await reviewedSnapshotAssets(provider);
    if (options.sourceRef && options.sourceRef !== provider.sourceRef)
      throw new RegistryError(
        'SOURCE_REVIEW_REQUIRED',
        'This provider can only be indexed from its reviewed immutable source snapshot.',
        409,
      );
    const assets = all.slice(options.offset ?? 0, (options.offset ?? 0) + 200);
    const offset = options.offset ?? 0;
    return {
      assets,
      total: all.length,
      offset,
      nextOffset: offset + assets.length < all.length ? offset + assets.length : null,
      sourceRef: provider.sourceRef!,
    };
  }
  const offset = options.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
    throw new RegistryError('INVALID_INPUT', 'Invalid provider offset.');
  if (provider.adapter === 'github-storybook') {
    const snapshot = await readAnimataSnapshot();
    if (options.sourceRef && options.sourceRef !== snapshot.ref)
      throw new RegistryError(
        'SOURCE_REVIEW_REQUIRED',
        'Animata can only be indexed from its reviewed, Storybook-verified source snapshot.',
        409,
      );
    const body = await budget.text(
      `https://raw.githubusercontent.com/${provider.repo}/${snapshot.ref}/${provider.licencePath}`,
    );
    const licence = licenceFromText(
      provider,
      body,
      `https://github.com/${provider.repo}/blob/${snapshot.ref}/${provider.licencePath}`,
      snapshot.observedAt,
    );
    const all = snapshot.items
      .map((item) =>
        storybookComponentAsset(item, provider, licence, snapshot.ref, snapshot.observedAt),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const assets = all.slice(offset, offset + 200);
    return {
      assets,
      total: all.length,
      offset,
      nextOffset: offset + assets.length < all.length ? offset + assets.length : null,
      sourceRef: snapshot.ref,
    };
  }
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
    all = [iconPackAsset(provider, ref!, licence, now)];
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
