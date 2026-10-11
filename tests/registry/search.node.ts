import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { seedCaptured } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { parseSearch } from '../../registry/domain.ts';
import { buildVocabulary, correctWord, editDistance } from '../../registry/spelling.ts';
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

test('L-8: the panel queries now return sensible results', async () => {
  const registry = await seeded();
  const ids = async (q: string) => (await registry.search({ q, limit: 24 })).items.map((i) => i.id);
  const accordion = await registry.search({ q: 'accordian' });
  assert.ok(accordion.items.some((item) => item.id === 'shadcn/accordion'));
  assert.deepEqual(accordion.correction, {
    query: 'accordion',
    original: 'accordian',
    changes: [{ from: 'accordian', to: 'accordion' }],
  });
  assert.ok((await ids('pricing table')).includes('animata/section-pricing'));
  const modal = await ids('modal');
  assert.ok(modal.includes('shadcn/dialog') && modal.includes('flowbite-react/modal'));
  const datepicker = await ids('datepicker');
  assert.deepEqual(new Set(datepicker), new Set(await ids('date picker')));
  assert.ok(datepicker.includes('heroui-web/date-picker'));
  assert.ok(datepicker.includes('flowbite-react/datepicker'));
  const hero = await registry.search({ q: 'add a shimmer button to my hero' });
  assert.equal(hero.match, 'any-term');
  assert.equal(hero.correction, null);
  assert.equal(hero.items[0].id, 'magic-ui/shimmer-button');
  assert.deepEqual(hero.items[0].ranking.matchedTerms, ['shimmer', 'button']);
});

test('L-8: synonyms and singulars widen a term without dropping exact matches', async () => {
  const registry = await seeded();
  const ids = async (q: string) => (await registry.search({ q, limit: 48 })).items.map((i) => i.id);
  assert.ok((await ids('toggle')).includes('shadcn/switch'));
  assert.ok((await ids('switch')).includes('shadcn/toggle'));
  assert.ok((await ids('navbar')).includes('shadcn/navigation-menu'));
  assert.ok((await ids('dialogs')).includes('shadcn/dialog'));
  const parsed = parseSearch({ q: 'date picker for my modals' });
  assert.deepEqual(parsed.terms, ['date picker', 'modals']);
  assert.deepEqual(parsed.groups[0].any, [['datepicker'], ['date', 'picker'], ['date-picker']]);
  assert.deepEqual(parsed.groups[1].any, [['modal'], ['dialog']]);
  assert.deepEqual(parseSearch({ q: 'cards' }).groups, [{ term: 'cards', any: [['card']] }]);
  assert.deepEqual(parseSearch({ q: 'glass' }).groups, [{ term: 'glass', any: [['glass']] }]);
});

test('L-8: spelling correction only fills an empty result and can be turned off', async () => {
  const registry = await seeded();
  const exact = await registry.search({ q: 'accordian', exact: 'true' });
  assert.equal(exact.total, 0);
  assert.equal(exact.correction, null);
  // Known words that a filter excludes are not "corrected" into something else.
  const filtered = await registry.search({ q: 'accordion', provider: 'magic-ui' });
  assert.equal(filtered.total, 0);
  assert.equal(filtered.correction, null);
  const phrase = await registry.search({ q: 'pricng tabel' });
  assert.equal(phrase.correction?.query, 'pricing table');
  assert.ok(phrase.items.some((item) => item.id === 'animata/section-pricing'));
  const typo = await registry.search({ q: 'shimer buton' });
  assert.equal(typo.correction?.query, 'shimmer button');
  assert.equal(typo.items[0].id, 'magic-ui/shimmer-button');
  // Nothing close: still empty, with no correction offered.
  const none = await registry.search({ q: 'react radar whichdoesnotexist' });
  assert.equal(none.total, 0);
  assert.equal(none.correction, null);
  assert.equal((await registry.search({ q: 'accordion' })).correction, null);
});

test('L-8: the any-term fallback needs three terms and never weakens a hard filter', async () => {
  const registry = await seeded();
  assert.equal((await registry.search({ q: 'shimmer button' })).match, 'all-terms');
  assert.equal((await registry.search({ q: 'shimmer accordion' })).total, 0);
  const scoped = await registry.search({
    q: 'add a shimmer button to my hero',
    provider: 'magic-ui',
    commercial: true,
    limit: 48,
  });
  assert.equal(scoped.match, 'any-term');
  assert.ok(scoped.total > 0);
  assert.ok(
    scoped.items.every(
      (item) => item.providerId === 'magic-ui' && item.licence.commercial === 'allowed',
    ),
  );
  for (let i = 1; i < scoped.items.length; i++)
    assert.ok(scoped.items[i - 1].ranking.score >= scoped.items[i].ranking.score);
  assert.ok(scoped.items.every((item) => item.ranking.matchedTerms.length > 0));
  const page = await registry.search({ q: 'add a shimmer button to my hero', limit: 5, offset: 5 });
  assert.equal(page.match, 'any-term');
  assert.equal(page.total, (await registry.search({ q: 'add a shimmer button to my hero' })).total);
});

test('L-8: forgiving search stays fast on the in-memory registry', async () => {
  const registry = await seeded();
  const queries = [
    'accordian',
    'pricing table',
    'modal',
    'datepicker',
    'add a shimmer button to my hero',
  ];
  for (const q of queries) await registry.search({ q });
  const times: number[] = [];
  for (let round = 0; round < 5; round++)
    for (const q of queries) {
      const start = performance.now();
      await registry.search({ q });
      times.push(performance.now() - start);
    }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const slowest = times[times.length - 1];
  assert.ok(median < 50, `median ${median}ms`);
  assert.ok(slowest < 100, `slowest ${slowest}ms`);
});

test('L-8: edit distance counts a swap as one edit and corrections prefer the first letter', () => {
  assert.equal(editDistance('accordian', 'accordion'), 1);
  assert.equal(editDistance('tabel', 'table'), 1);
  assert.equal(editDistance('datepiker', 'datepicker'), 1);
  assert.equal(editDistance('modal', 'dialog', 2), 3);
  const vocabulary = buildVocabulary([
    { name: 'Label', searchText: 'label' },
    { name: 'Label Group', searchText: 'label group' },
    { name: 'Table', searchText: 'table' },
  ]);
  assert.equal(correctWord('tabel', vocabulary), 'table');
  assert.equal(correctWord('table', vocabulary), null);
  assert.equal(correctWord('tbl', vocabulary), null);
  assert.equal(correctWord('zzzzzz', vocabulary), null);
  assert.equal(correctWord('buttns', buildVocabulary([])), 'buttons');
});
