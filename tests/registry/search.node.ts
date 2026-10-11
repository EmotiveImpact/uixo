import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { seedCaptured } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { licenceLabel } from '../../shared/licence-label.ts';
import { KIBO_REVIEWED_COMPONENTS } from '../../shared/reviewed-previews.ts';

type Item = Awaited<ReturnType<Registry['search']>>['items'][number];

let shared: Promise<Registry> | undefined;
/** One seeded in-memory registry for every read-only search test in this file. */
function seeded(): Promise<Registry> {
  return (shared ??= (async () => {
    const db = await sqliteDatabase();
    await migrate(db);
    const registry = new Registry(db);
    await seedCaptured(registry);
    return registry;
  })());
}
test.after(async () => {
  if (shared) await (await shared).db.close();
});

async function all(registry: Registry, input: Record<string, unknown>): Promise<Item[]> {
  const items: Item[] = [];
  for (let offset = 0; ; offset += 48) {
    const page = await registry.search({ ...input, limit: 48, offset });
    items.push(...page.items);
    if (page.nextOffset === null) return items;
  }
}

test('L-7: the no-query order leads with picks, ready previews, install commands and commercial use', async () => {
  const registry = await seeded();
  const live = Object.keys(
    JSON.parse(await readFile(new URL('../../live-demos/manifest.json', import.meta.url), 'utf8')),
  );
  const ready = new Set([
    ...live,
    ...Object.keys(KIBO_REVIEWED_COMPONENTS).map((slug) => `kibo-ui/${slug}`),
  ]);
  const pending = new Set(PROVIDERS.filter((p) => p.previewsPending).map((p) => p.id));
  const preview = (item: Item) =>
    pending.has(item.providerId)
      ? 0
      : ready.has(item.id) || item.preview?.kind === 'image'
        ? 2
        : item.preview?.kind === 'embed'
          ? 1
          : 0;
  const install = (item: Item) =>
    ['registry', 'package'].includes(item.variants[0]?.acquisition.kind) ? 1 : 0;
  const key = (item: Item) => [
    item.editorialPick ? 1 : 0,
    preview(item),
    install(item),
    item.licence.commercial === 'allowed' ? 1 : 0,
  ];
  for (const filter of [{ kind: 'component' }, { category: 'buttons' }, {}]) {
    const items = await all(registry, filter);
    assert.ok(items.length > 10);
    for (let i = 1; i < items.length; i++) {
      const [a, b] = [key(items[i - 1]), key(items[i])];
      const order = a.findIndex((value, index) => value !== b[index]);
      if (order === -1) {
        if (items[i - 1].kind === items[i].kind)
          assert.ok(
            items[i - 1].name.toLowerCase() <= items[i].name.toLowerCase(),
            `${items[i - 1].name} before ${items[i].name}`,
          );
      } else assert.ok(a[order] > b[order], `${items[i - 1].id} ranks before ${items[i].id}`);
    }
  }
  const buttons = await registry.search({ category: 'buttons', limit: 12 });
  assert.ok(
    buttons.items.every(
      (item) => install(item) === 1 && item.licence.commercial === 'allowed' && preview(item) === 2,
    ),
    'The first Buttons row is takeable, previewed and free for commercial use',
  );
  const first = await registry.search({ kind: 'component', limit: 24 });
  assert.ok(first.items.every((item) => install(item) === 1));
  assert.ok(first.items.every((item) => item.licenceLabel === 'Free'));
});

test('L-7: name sort is case-insensitive and newest still pages through everything', async () => {
  const registry = await seeded();
  const names = (await all(registry, { kind: 'component', sort: 'name' })).map((item) =>
    item.name.toLowerCase(),
  );
  assert.deepEqual(
    names,
    [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  assert.ok(names.indexOf('accordion') < names.indexOf('art+tech download cta'));
  const newest = await all(registry, { kind: 'component', sort: 'newest' });
  assert.equal(newest.length, names.length);
});

test('L-7: query ranking still puts name matches first', async () => {
  const registry = await seeded();
  const result = await registry.search({ q: 'shimmer', limit: 5 });
  assert.ok(result.items[0].name.toLowerCase().includes('shimmer'));
  assert.equal(result.items[0].ranking.score, 10);
});

test('L-1: every search result carries the shared licence label', async () => {
  const registry = await seeded();
  const items = await all(registry, { kind: 'component' });
  for (const item of items) assert.equal(item.licenceLabel, licenceLabel(item));
  const unknown = items.filter((item) => item.licence.commercial === 'unknown');
  assert.ok(unknown.length > 100);
  assert.ok(
    unknown.every((item) => item.price === 'free' && item.licenceLabel === 'Licence unknown'),
  );
  assert.ok(
    items
      .filter((item) => item.licence.commercial === 'allowed')
      .every((item) => item.licenceLabel === 'Free'),
  );
});

test('L-1: the licence label says Free only when commercial use is allowed', () => {
  const label = (price: string, commercial: string, expression = 'MIT') =>
    licenceLabel({ price, licence: { commercial, expression } });
  assert.equal(label('free', 'allowed'), 'Free');
  assert.equal(label('free', 'unknown', 'No standard licence declared'), 'Licence unknown');
  assert.equal(label('free', 'restricted', 'CC BY-NC 4.0'), 'CC BY-NC 4.0');
  assert.equal(label('free', 'restricted', ''), 'Licence unknown');
  assert.equal(label('unknown', 'allowed'), 'MIT');
  assert.equal(label('paid', 'unknown'), 'Paid');
});
