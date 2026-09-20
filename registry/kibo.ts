import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { KIBO_REVIEWED_COMPONENTS } from '../shared/reviewed-previews.ts';
import { componentCategory } from '../shared/component-categories.ts';
import { record, strings, text, type Asset, type Licence, type Provider } from './domain.ts';

export const KIBO_REF = '3d63cdb15b79d972e3dc38a10997987672f9b263';
export const KIBO_SNAPSHOT = `data/registry/snapshots/kibo-ui-${KIBO_REF}.json`;
export const KIBO_SNAPSHOT_SHA256 =
  '4ee2799dcd1d4066ecf6e63ab2cfe045d83195119df6e599c3476edf62a95926';
export type ReviewedSource = { path: string; sha256: string; bytes: number };
export type KiboItem = {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  sourcePath: string;
  sourceSha256: string;
  packagePath: string;
  package: { name: string; dependencies: Record<string, string> };
  docsPath: string;
  examplePath: string;
  exampleSha256: string;
  registryDependencies: string[];
  registryUrl: string;
  previewPath: string;
  previewStrategy: 'local-pinned-upstream-example';
};
export type KiboSnapshot = {
  schemaVersion: 1;
  providerId: 'kibo-ui';
  repo: 'shadcnblocks/kibo';
  branch: 'main';
  website: 'https://www.kibo-ui.com/';
  ref: string;
  observedAt: string;
  licence: { identifier: string; path: string; sourceUrl: string; sha256: string };
  preview: { strategy: string };
  files: ReviewedSource[];
  items: KiboItem[];
  inventory: {
    packageCount: number;
    reactComponentCount: number;
    reviewedCount: number;
    excludedCount: number;
    blockedCount: number;
    records: { slug: string; state: string; reason: string }[];
  };
};
const invalid = (): never => {
  throw new Error('Kibo reviewed snapshot is invalid; repeat the source and preview audit.');
};
const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safePath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 250 &&
  /^[a-zA-Z0-9_./[\]()-]+$/.test(value) &&
  !value.startsWith('/') &&
  value.split('/').every((segment) => segment && segment !== '.' && segment !== '..');

/** Parse data only. Upstream TypeScript is never evaluated during ingestion. */
export function parseKiboSnapshot(body: string): KiboSnapshot {
  if (Buffer.byteLength(body, 'utf8') > 300000) return invalid();
  const snapshot = record(JSON.parse(body)) as unknown as KiboSnapshot;
  if (
    snapshot.schemaVersion !== 1 ||
    snapshot.providerId !== 'kibo-ui' ||
    snapshot.repo !== 'shadcnblocks/kibo' ||
    snapshot.branch !== 'main' ||
    snapshot.website !== 'https://www.kibo-ui.com/' ||
    snapshot.ref !== KIBO_REF ||
    !Number.isFinite(Date.parse(snapshot.observedAt)) ||
    snapshot.preview?.strategy !== 'local-pinned-upstream-example' ||
    snapshot.licence?.identifier !== 'MIT' ||
    snapshot.licence.path !== 'license.md' ||
    snapshot.licence.sourceUrl !==
      `https://github.com/shadcnblocks/kibo/blob/${KIBO_REF}/license.md` ||
    !digest(snapshot.licence.sha256) ||
    !Array.isArray(snapshot.items) ||
    snapshot.items.length !== 10 ||
    !Array.isArray(snapshot.files) ||
    !snapshot.files.length ||
    snapshot.files.length > 128
  )
    return invalid();
  const sources = new Map<string, ReviewedSource>();
  for (const source of snapshot.files) {
    if (
      !safePath(source.path) ||
      !digest(source.sha256) ||
      !Number.isSafeInteger(source.bytes) ||
      source.bytes < 1 ||
      source.bytes > 1048576 ||
      sources.has(source.path)
    )
      return invalid();
    sources.set(source.path, source);
  }
  if (
    snapshot.files.reduce((sum, source) => sum + source.bytes, 0) > 8000000 ||
    sources.get('license.md')?.sha256 !== snapshot.licence.sha256
  )
    return invalid();
  const seen = new Set<string>();
  for (const item of snapshot.items) {
    if (!Object.hasOwn(KIBO_REVIEWED_COMPONENTS, item.slug) || seen.has(item.slug))
      return invalid();
    seen.add(item.slug);
    text(item.name, 150);
    text(item.description, 1600);
    strings(item.tags, 20);
    if (
      item.sourcePath !== `packages/${item.slug}/index.tsx` ||
      item.packagePath !== `packages/${item.slug}/package.json` ||
      item.docsPath !== `apps/docs/content/components/${item.slug}.mdx` ||
      item.examplePath !== `apps/docs/examples/${item.slug}.tsx` ||
      item.package?.name !== `@repo/${item.slug}` ||
      item.category !==
        KIBO_REVIEWED_COMPONENTS[item.slug as keyof typeof KIBO_REVIEWED_COMPONENTS] ||
      item.previewStrategy !== 'local-pinned-upstream-example' ||
      item.previewPath !== `/provider-demos/kibo-ui/index.html?id=${item.slug}` ||
      item.registryUrl !== `https://www.kibo-ui.com/r/${item.slug}.json` ||
      sources.get(item.sourcePath)?.sha256 !== item.sourceSha256 ||
      sources.get(item.examplePath)?.sha256 !== item.exampleSha256 ||
      !sources.has(item.packagePath) ||
      !sources.has(item.docsPath)
    )
      return invalid();
    const dependencies = record(item.package.dependencies);
    if (Object.keys(dependencies).length > 40) return invalid();
    for (const [name, range] of Object.entries(dependencies)) {
      if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name)) return invalid();
      text(range, 150);
    }
    strings(item.registryDependencies, 40);
    if (item.registryDependencies.some((name) => !/^[a-z0-9-]+$/.test(name))) return invalid();
  }
  const inventory = snapshot.inventory;
  if (
    !inventory ||
    inventory.packageCount !== 44 ||
    inventory.reactComponentCount !== 40 ||
    inventory.reviewedCount !== 10 ||
    inventory.excludedCount !== 4 ||
    inventory.blockedCount !== 30 ||
    !Array.isArray(inventory.records) ||
    inventory.records.length !== 44 ||
    new Set(inventory.records.map((item) => item.slug)).size !== 44
  )
    return invalid();
  for (const item of inventory.records) {
    if (
      !/^[a-z0-9-]+$/.test(item.slug) ||
      !['reviewed', 'excluded', 'blocked'].includes(item.state)
    )
      return invalid();
    text(item.reason, 1000);
    if ((item.state === 'reviewed') !== seen.has(item.slug)) return invalid();
  }
  for (const [state, expected] of [
    ['reviewed', 10],
    ['excluded', 4],
    ['blocked', 30],
  ] as const)
    if (inventory.records.filter((item) => item.state === state).length !== expected)
      return invalid();
  return snapshot;
}

export async function readKiboSnapshot(): Promise<KiboSnapshot> {
  const body = await readFile(new URL(`../${KIBO_SNAPSHOT}`, import.meta.url), 'utf8');
  if (createHash('sha256').update(body).digest('hex') !== KIBO_SNAPSHOT_SHA256) return invalid();
  return parseKiboSnapshot(body);
}

export async function readKiboLicence(snapshot: KiboSnapshot): Promise<string> {
  const body = await readFile(
    new URL('../data/registry/licences/kibo-ui.txt', import.meta.url),
    'utf8',
  );
  if (createHash('sha256').update(body).digest('hex') !== snapshot.licence.sha256) return invalid();
  return body;
}

export function kiboComponentAsset(
  item: KiboItem,
  provider: Provider,
  licence: Licence,
  snapshot: KiboSnapshot,
): Asset {
  if (
    provider.id !== 'kibo-ui' ||
    provider.repo !== snapshot.repo ||
    licence.commercial !== 'allowed' ||
    licence.redistribution !== 'allowed' ||
    createHash('sha256').update(licence.text).digest('hex') !== snapshot.licence.sha256
  )
    return invalid();
  const base = `https://github.com/${snapshot.repo}/blob/${snapshot.ref}/`;
  const id = `${provider.id}/${item.slug}`;
  const dependencies = Object.fromEntries(
    Object.entries(item.package.dependencies).filter(([name]) => !name.startsWith('@repo/')),
  );
  return {
    id,
    providerId: provider.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    kind: 'component',
    category: componentCategory(item.slug, provider.id),
    tags: [...item.tags, 'react', 'tailwind'],
    price: 'free',
    sourceUrl: base + item.sourcePath,
    licence,
    variants: [
      {
        id: `${id}/react`,
        framework: 'react',
        format: 'tsx',
        css: 'tailwind',
        dependencies: Object.keys(dependencies),
        dependencyVersions: dependencies,
        registryDependencies: item.registryDependencies,
        peerDependencies: {},
        sourceRef: snapshot.ref,
        acquisition: { kind: 'registry', url: item.registryUrl },
      },
    ],
    evidence: [
      ['source', item.sourcePath],
      ['dependencies', item.packagePath],
      ['preview', item.examplePath],
      ['installation', 'scripts/index.ts'],
      ['documentation', item.docsPath],
      ['inventory', 'apps/docs/app/r/registry.json/route.ts'],
    ].map(([field, path]) => ({
      field,
      url: base + path,
      reference: snapshot.ref,
      observedAt: snapshot.observedAt,
      method: 'inspected' as const,
    })),
    verifiedAt: snapshot.observedAt,
    preview: {
      kind: 'embed',
      url: `https://uixo-brown.vercel.app${item.previewPath}`,
      label:
        'Original Kibo component and official example, rendered locally from the pinned upstream source.',
    },
    editorialPick: false,
  };
}
