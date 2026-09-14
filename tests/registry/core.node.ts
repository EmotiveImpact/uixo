import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { capturedAssets, seedCaptured, syncCaptured } from '../../registry/bootstrap.ts';
import { parseSearch, validateAsset, canonicalUrl, parseScout } from '../../registry/domain.ts';
import {
  resolveAsset,
  checkCompatibility,
  satisfies,
  tokenMatches,
} from '../../registry/policy.ts';
import { FetchBudget } from '../../registry/fetcher.ts';
import { enqueue, runJob } from '../../registry/jobs.ts';
import {
  indexPage,
  parseJsonRegistry,
  parseShadcnManifest,
  PROVIDERS,
} from '../../registry/providers.ts';

async function setup() {
  const db = await sqliteDatabase();
  await migrate(db);
  const registry = new Registry(db);
  return { db, registry };
}

test('migration and captured-source seed are repeatable; counts reflect actual rows', async () => {
  const { db, registry } = await setup();
  try {
    await migrate(db);
    const first = await seedCaptured(registry),
      second = await seedCaptured(registry);
    assert.equal(first.inserted, 264);
    assert.equal(second.inserted, 0);
    assert.equal((await registry.stats()).assets, 264);
    assert.equal((await registry.providers()).length, 6);
  } finally {
    await db.close();
  }
});
test('verified preview sync repairs existing records and unpublishes source-less exclusions', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const record = await registry.inspect('shadcn/accordion');
    // Model an older production catalogue that never staged the new captured-preview payload.
    await db.query('DELETE FROM uixo_v2_revisions WHERE asset_id=$1', [record.id]);
    await db.query('UPDATE uixo_v2_assets SET payload=$1,fingerprint=$2 WHERE id=$3', [
      JSON.stringify({
        ...record,
        preview: { kind: 'schematic', label: 'Fabricated legacy preview' },
      }),
      'legacy-fingerprint',
      record.id,
    ]);
    await db.query(
      "INSERT INTO uixo_v2_assets(id,provider_id,slug,name,kind,price,source_url,licence_id,search_text,payload,fingerprint,updated_at) SELECT 'magic-ui/grid-beams',provider_id,'grid-beams','Grid Beams',kind,price,source_url,licence_id,search_text,payload,'legacy-grid-beams',updated_at FROM uixo_v2_assets WHERE id='magic-ui/globe'",
    );

    const result = await syncCaptured(registry);
    assert.equal(result.updated, 1);
    assert.equal(result.removed, 1);
    assert.equal((await registry.inspect(record.id)).preview?.kind, 'image');
    await assert.rejects(registry.inspect('magic-ui/grid-beams'), /not found/);
    const audit = await db.query(
      "SELECT action FROM uixo_v2_audit WHERE target='magic-ui/grid-beams' ORDER BY created_at DESC LIMIT 1",
    );
    assert.equal(audit[0]?.action, 'unpublish');
  } finally {
    await db.close();
  }
});
test('publication is a separate atomic review gate; edits do not replace live records', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0],
      draft = await registry.stage(asset);
    assert.equal((await registry.search({})).total, 0);
    assert.equal((await registry.queue()).total, 1);
    await registry.review(draft.id, 'approve', 'test-curator', 'Source and licence inspected.');
    assert.equal((await registry.search({})).total, 1);
    await registry.stage({ ...asset, name: 'A changed name' });
    assert.equal((await registry.inspect(asset.id)).name, asset.name);
    await assert.rejects(
      registry.review(draft.id, 'approve', 'other', 'Duplicate review'),
      /already reviewed/,
    );
  } finally {
    await db.close();
  }
});
test('rejection and unapproved-provider blocks do not leak draft assets into search', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0];
    const draft = await registry.stage(asset);
    await registry.review(draft.id, 'reject', 'curator', 'Not selected.');
    assert.equal((await registry.search({})).total, 0);
    await registry.putProvider({ ...PROVIDERS[0], approved: false });
    await assert.rejects(registry.stage({ ...asset, name: 'changed' }), /Approved provider/);
  } finally {
    await db.close();
  }
});
test('search enforces framework and format on the same variant and excludes unknown licences', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    assert.equal((await registry.search({ framework: 'react', format: 'svg' })).total, 0);
    assert.equal(
      (await registry.search({ q: 'find me a free React sidebar', commercial: true })).total,
      1,
    );
    assert.equal((await registry.search({ q: 'react radar whichdoesnotexist' })).total, 0);
    const first = await registry.search({ kind: 'component', limit: 5 });
    const second = await registry.search({ kind: 'component', limit: 5, offset: 5 });
    assert.equal(first.items.length, 5);
    assert.equal(new Set([...first.items, ...second.items].map((a) => a.id)).size, 10);
  } finally {
    await db.close();
  }
});
test('search rejects invalid bounds and normalises intent without inventing semantics', () => {
  assert.throws(() => parseSearch({ limit: -1 }));
  assert.throws(() => parseSearch({ limit: '3x' }));
  assert.throws(() => parseSearch({ commercial: 'yes' }));
  const parsed = parseSearch({ q: 'Find me free React sidebar components' });
  assert.equal(parsed.framework, 'react');
  assert.equal(parsed.price, 'free');
  assert.deepEqual(parsed.terms, ['sidebar']);
});
test('unsafe metadata, identifiers, URLs and unsupported licence certainty are rejected', async () => {
  const asset = (await capturedAssets())[0];
  for (const sourceUrl of [
    'http://example.com',
    'https://127.0.0.1/',
    'https://user:pass@example.com/',
    'javascript:alert(1)',
  ])
    assert.throws(() => validateAsset({ ...asset, sourceUrl }));
  assert.throws(() => validateAsset({ ...asset, id: '../admin' }));
  assert.throws(() => validateAsset({ ...asset, licence: { ...asset.licence, text: '' } }));
  assert.throws(() =>
    validateAsset({
      ...asset,
      preview: { kind: 'schematic', label: 'An invented substitute for the real component' },
    }),
  );
});
test('acquisition blocks unknown, restricted and stale licences; never executes', async () => {
  const asset = (await capturedAssets())[0];
  const ready = resolveAsset(asset);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.executed, false);
  assert.equal(
    resolveAsset({ ...asset, licence: { ...asset.licence, redistribution: 'unknown' } }).status,
    'blocked',
  );
  assert.equal(
    resolveAsset({ ...asset, licence: { ...asset.licence, checkedAt: '2020-01-01T00:00:00.000Z' } })
      .status,
    'blocked',
  );
  const paid = {
    ...asset,
    variants: [
      {
        ...asset.variants[0],
        acquisition: { kind: 'purchase' as const, url: 'https://example.com/buy' },
      },
    ],
  };
  assert.equal(resolveAsset(paid).status, 'external');
  assert.throws(() =>
    resolveAsset({
      ...asset,
      variants: [
        {
          ...asset.variants[0],
          acquisition: { kind: 'registry', url: 'https://evil.example/r/code' },
        },
      ],
    }),
  );
});
test('compatibility is conservative about missing packages and unsupported ranges', async () => {
  const asset = (await capturedAssets())[0];
  assert.equal(checkCompatibility(asset, { framework: 'vue' }).status, 'incompatible');
  assert.equal(checkCompatibility(asset, { framework: 'react' }).status, 'requires-change');
  assert.equal(
    checkCompatibility(asset, { framework: 'react', packages: { 'radix-ui': '1.0.0' } }).status,
    'unknown',
  );
  assert.equal(satisfies('19.1.0', '^19.0.0'), true);
  assert.equal(satisfies('20.0.0', '^19.0.0'), false);
  assert.equal(satisfies('0.3.0', '^0.2.0'), false);
  assert.equal(satisfies('19.1.0', '>=18.0.0 <20.0.0'), true);
  assert.equal(satisfies('19.1.0-beta', '^19.0.0'), null);
  assert.equal(satisfies('19.1.0', 'workspace:*'), null);
});
test('Grok intake is idempotent, canonicalised and never publishes', async () => {
  const { db, registry } = await setup();
  try {
    const input = {
      items: [
        {
          name: 'Source',
          url: 'https://www.example.com/?utm_source=x',
          postUrl: 'https://x.com/creator/status/123',
          creator: 'creator',
          note: 'Found on X',
        },
      ],
    };
    assert.equal((await registry.scout(input)).inserted, 1);
    assert.equal((await registry.scout(input)).duplicates, 1);
    assert.equal((await registry.stats()).assets, 0);
    assert.equal(canonicalUrl('https://example.com/?utm_campaign=test'), 'https://example.com/');
    assert.throws(() => parseScout({ items: [] }));
  } finally {
    await db.close();
  }
});
test('indexing jobs persist status, deduplicate drafts and enforce claim ownership', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const assets = [(await capturedAssets())[0]];
    const job = await enqueue(registry, 'shadcn');
    await assert.rejects(enqueue(registry, 'shadcn'), /active job/);
    const result = await runJob(registry, job.id, async () => assets);
    assert.equal(result.staged, 1);
    assert.equal(result.published, 0);
    await assert.rejects(runJob(registry, job.id), { code: 'JOB_NOT_CLAIMABLE' });
    const next = await enqueue(registry, 'shadcn');
    assert.equal((await runJob(registry, next.id, async () => assets)).duplicates, 1);
    const failed = await enqueue(registry, 'shadcn');
    await assert.rejects(
      runJob(registry, failed.id, async () => {
        throw new Error('secret upstream credential');
      }),
    );
    const row = (
      await db.query('SELECT status,error FROM uixo_v2_jobs WHERE id=$1', [failed.id])
    )[0];
    assert.equal(row.status, 'retry');
    assert.equal(row.error, 'INDEX_FAILED');
  } finally {
    await db.close();
  }
});
test('remote fetching limits hosts, redirects, response size and request counts', async () => {
  let calls = 0;
  const budget = new FetchBudget({
    requests: 1,
    fetchImpl: async () => {
      calls++;
      return new Response('{}');
    },
  });
  await assert.rejects(budget.json('https://169.254.169.254/metadata'), /not approved/);
  await budget.json('https://api.github.com/repos/a/b');
  assert.equal(calls, 1);
  await assert.rejects(budget.json('https://api.github.com/repos/a/b'), /budget/);
  await assert.rejects(
    new FetchBudget({ fetchImpl: async () => new Response('', { status: 302 }) }).text(
      'https://ui.shadcn.com/r/test.json',
    ),
    /redirects/,
  );
  await assert.rejects(
    new FetchBudget({ maxBytes: 2, fetchImpl: async () => new Response('too long') }).text(
      'https://api.github.com/repos/a/b',
    ),
    /byte budget/,
  );
});
test('manifest parser never executes upstream source and rejects unknown layouts', () => {
  const parsed = parseShadcnManifest(
    'export const items = [\n  {\n    name: "button",\n    dependencies: ["radix-ui"],\n  },\n]',
  );
  assert.deepEqual(parsed[0], {
    name: 'button',
    dependencies: ['radix-ui'],
    registryDependencies: [],
  });
  assert.throws(() => parseShadcnManifest('process.exit(1)'));
});
test('JSON registry parser accepts declared UI components and ignores examples', () => {
  const parsed = parseJsonRegistry(
    JSON.stringify({
      items: [
        {
          name: 'animated-card',
          type: 'registry:ui',
          title: 'Animated Card',
          description: 'A card with a declared animation.',
          dependencies: ['motion'],
          registryDependencies: ['button'],
          categories: ['motion'],
          files: [{ path: 'components/animated-card.tsx', type: 'registry:component' }],
        },
        {
          name: 'animated-card-demo',
          type: 'registry:example',
          files: [{ path: 'examples/animated-card.tsx', type: 'registry:example' }],
        },
      ],
    }),
  );
  assert.deepEqual(parsed, [
    {
      name: 'animated-card',
      title: 'Animated Card',
      description: 'A card with a declared animation.',
      dependencies: ['motion'],
      registryDependencies: ['button'],
      categories: ['motion'],
      sourcePath: 'components/animated-card.tsx',
      format: 'tsx',
    },
  ]);
  assert.throws(() => parseJsonRegistry('{broken'));
  assert.throws(() =>
    parseJsonRegistry(
      JSON.stringify({
        items: [
          {
            name: 'unsafe',
            type: 'registry:ui',
            files: [{ path: '../unsafe.tsx' }],
          },
        ],
      }),
    ),
  );
});
test('captured React registries retain pinned source, licence and acquisition evidence', async () => {
  const assets = await capturedAssets();
  const components = assets.filter((asset) => asset.kind === 'component');
  const magic = assets.filter((asset) => asset.providerId === 'magic-ui');
  const motion = assets.filter((asset) => asset.providerId === 'motion-primitives');
  assert.equal(magic.length, 68);
  assert.equal(motion.length, 33);
  assert.ok(
    components.every(
      (asset) =>
        (asset.preview?.kind === 'image' && asset.preview.url) ||
        asset.providerId === 'simply-buttons' ||
        ['switch', 'table', 'tabs', 'textarea', 'toggle', 'toggle-group', 'tooltip'].includes(
          asset.slug,
        ),
    ),
    'Existing captures are retained; new live-only components must not invent screenshot URLs',
  );
  assert.ok(
    [...magic, ...motion].every(
      (asset) =>
        asset.preview?.kind === 'image' &&
        asset.preview.url ===
          `https://uixo-brown.vercel.app/assets/component-previews/${asset.id}.webp`,
    ),
    'React registry assets must ship an official captured preview, never a schematic',
  );
  assert.ok(
    magic.every((asset) =>
      asset.sourceUrl.includes(
        '/magicuidesign/magicui/blob/52bc69354621e5cd7c9bc84a0e42b42f2d0c07b1/apps/www/',
      ),
    ),
    'Magic UI install-registry paths must resolve to their real repository source root',
  );
  assert.ok(
    !magic.some((asset) =>
      [
        'script-copy-btn',
        'flip-text',
        'scratch-to-reveal',
        'box-reveal',
        'iphone-15-pro',
        'arc-timeline',
        'grid-beams',
      ].includes(asset.slug),
    ),
    'Manifest entries without source at the pinned revision must not be published',
  );
  assert.ok([...magic, ...motion].every((asset) => asset.licence.expression === 'MIT'));
  assert.ok(
    magic.every(
      (asset) => asset.variants[0].sourceRef === '52bc69354621e5cd7c9bc84a0e42b42f2d0c07b1',
    ),
  );
  assert.ok(
    motion.every(
      (asset) => asset.variants[0].sourceRef === '40f59b61e567712aa8329c7dc8c2ced763054c34',
    ),
  );
  const magicRecipe = resolveAsset(magic.find((asset) => asset.slug === 'globe')!);
  assert.equal(magicRecipe.status, 'ready');
  assert.equal(magicRecipe.url, 'https://magicui.design/r/globe.json');
  const motionRecipe = resolveAsset(motion.find((asset) => asset.slug === 'text-effect')!);
  assert.equal(motionRecipe.status, 'ready');
  assert.equal(motionRecipe.url, 'https://motion-primitives.com/c/text-effect.json');
});
test('generic GitHub registry indexing pins the discovered revision', async () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'magic-ui')!;
  const ref = 'a'.repeat(40);
  const manifest = JSON.stringify({
    items: [
      {
        name: 'verified-card',
        type: 'registry:ui',
        title: 'Verified Card',
        description: 'A card declared by the provider registry.',
        dependencies: ['motion'],
        files: [{ path: 'registry/verified-card.tsx', type: 'registry:ui' }],
      },
    ],
  });
  const licence =
    'Permission is hereby granted, free of charge.\nCopyright notice and this permission notice.';
  const budget = new FetchBudget({
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.includes('/git/refs/heads/'))
        return new Response(JSON.stringify({ object: { sha: ref } }));
      if (url.endsWith(`/${provider.licencePath}`)) return new Response(licence);
      if (url.endsWith(`/${provider.registryPath}`)) return new Response(manifest);
      return new Response('', { status: 404 });
    },
  });
  const indexed = await indexPage(provider.id, {}, budget);
  assert.equal(indexed.sourceRef, ref);
  assert.equal(indexed.assets.length, 1);
  assert.equal(indexed.assets[0].id, 'magic-ui/verified-card');
  assert.equal(indexed.assets[0].variants[0].sourceRef, ref);
});
test('scoped token comparison fails closed and rejects short secrets', () => {
  const token = 'x'.repeat(32);
  assert.equal(tokenMatches(token, token), true);
  assert.equal(tokenMatches('x', 'x'), false);
  assert.equal(tokenMatches(token, undefined), false);
  assert.equal(tokenMatches('y'.repeat(32), token), false);
});

test('a stale revision cannot overwrite a separately approved edit', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const asset = await registry.inspect('shadcn/accordion');
    const first = await registry.stage({ ...asset, name: 'First curator edit' }),
      second = await registry.stage({ ...asset, name: 'Second curator edit' });
    await registry.review(first.id, 'approve', 'curator-one', 'Inspected the proposed first edit.');
    await assert.rejects(
      registry.review(second.id, 'approve', 'curator-two', 'Attempt to approve stale base.'),
      /changed/,
    );
    assert.equal((await registry.inspect(asset.id)).name, 'First curator edit');
  } finally {
    await db.close();
  }
});
test('re-seeding preserves curator edits and provider revocation', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const asset = await registry.inspect('shadcn/accordion');
    const proposed = await registry.stage({ ...asset, name: 'Editorially corrected name' });
    await registry.review(
      proposed.id,
      'approve',
      'test',
      'Keep the inspected metadata correction.',
    );
    await registry.putProvider({ ...PROVIDERS[1], approved: false });
    await seedCaptured(registry);
    assert.equal((await registry.inspect(asset.id)).name, 'Editorially corrected name');
    await assert.rejects(registry.provider('lucide'), /not found/);
    assert.equal((await registry.search({ provider: 'lucide' })).total, 0);
  } finally {
    await db.close();
  }
});
test('continuation runs keep the provider revision and do not repeat page one', async () => {
  const { db, registry } = await setup();
  try {
    await registry.putProvider(PROVIDERS[0]);
    const asset = (await capturedAssets())[0],
      ref = 'a'.repeat(40);
    const first = await enqueue(registry, 'shadcn');
    await runJob(registry, first.id, async () => ({
      assets: [asset],
      offset: 0,
      total: 2,
      nextOffset: 1,
      sourceRef: ref,
    }));
    const next = await enqueue(registry, 'shadcn', first.id);
    let supplied;
    await runJob(registry, next.id, async (_id, options) => {
      supplied = options;
      return { assets: [], offset: 1, total: 2, nextOffset: null, sourceRef: ref };
    });
    assert.deepEqual(supplied, { offset: 1, sourceRef: ref });
    await assert.rejects(enqueue(registry, 'shadcn', next.id), /remaining page/);
  } finally {
    await db.close();
  }
});

test('discovery lists icon packs, retains legacy saved icons and filters component categories', async () => {
  const { db, registry } = await setup();
  try {
    await seedCaptured(registry);
    const pack = await registry.inspect('lucide/pack');
    const legacy = {
      ...pack,
      id: 'lucide/legacy-glyph',
      slug: 'legacy-glyph',
      name: 'Legacy glyph',
      variants: pack.variants.map((variant) => ({
        ...variant,
        id: variant.id.replace('/pack/', '/legacy-glyph/'),
      })),
      kind: 'icon',
    };
    const staged = await registry.stage(legacy);
    await registry.review(
      staged.id,
      'approve',
      'test-curator',
      'Exercise existing saved icon compatibility.',
    );
    const all = await registry.search({ limit: 48 });
    assert.equal(all.total, 264);
    const packs = await registry.search({ kind: 'icon' });
    assert.equal(packs.total, 2);
    assert.ok(packs.items.every((asset) => asset.kind === 'icon-pack'));
    assert.equal(
      (await registry.search({ saved: ['lucide/legacy-glyph'] })).items[0].id,
      legacy.id,
    );
    assert.equal((await registry.inspect(legacy.id)).kind, 'icon');
    const forms = await registry.search({ category: 'forms', limit: 48 });
    assert.ok(forms.items.some((asset) => asset.id === 'shadcn/switch'));
    assert.ok(
      forms.items.every((asset) => asset.kind === 'component' && asset.category === 'forms'),
    );
    const combined = await registry.search({
      category: 'forms',
      q: 'switch',
      provider: 'shadcn',
      price: 'free',
      framework: 'react',
    });
    assert.deepEqual(
      combined.items.map((asset) => asset.id),
      ['shadcn/switch'],
    );
    assert.equal(
      (await registry.search({ category: 'forms', offset: 1, limit: 1 })).total,
      forms.total,
    );
    assert.throws(() => parseSearch({ category: 'made-up' }), /Expected one of/);
  } finally {
    await db.close();
  }
});

test('icon indexing emits one library without fetching individual glyph trees', async () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'lucide')!;
  const ref = 'a'.repeat(40);
  const requests: string[] = [];
  const budget = new FetchBudget({
    fetchImpl: async (input) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith('/LICENSE'))
        return new Response(
          'Permission is hereby granted, free of charge. Copyright notice and this permission notice.',
        );
      throw new Error(`Unexpected icon crawl: ${url}`);
    },
  });
  const result = await indexPage(provider.id, { sourceRef: ref }, budget);
  assert.equal(result.total, 1);
  assert.equal(result.nextOffset, null);
  assert.equal(result.assets[0].kind, 'icon-pack');
  assert.equal(result.assets[0].sourceUrl, provider.url);
  assert.equal(requests.length, 1);
});

test('Simply Buttons keeps original provenance and does not invent licence permissions', async () => {
  const assets = (await capturedAssets()).filter((asset) => asset.providerId === 'simply-buttons');
  assert.equal(assets.length, 108);
  for (const original of assets) {
    const asset = validateAsset(original);
    assert.equal(asset.category, 'buttons');
    assert.equal(asset.licence.commercial, 'unknown');
    assert.equal(asset.licence.redistribution, 'unknown');
    assert.match(
      asset.sourceUrl,
      /bits933\/simply-buttons\/blob\/d76ed2a67cc2fc7fbfa14d62d0704668d20e415d\/src\/buttons\//,
    );
    assert.match(asset.variants[0].format, /^(jsx|tsx)$/);
    assert.equal(resolveAsset(asset).status, 'external');
    assert.match(resolveAsset(asset).url, /^https:\/\/simply-buttons\.vercel\.app\//);
  }
  assert.ok(assets.some((asset) => asset.variants[0].dependencies.includes('three')));
  assert.ok(assets.some((asset) => asset.sourceUrl.endsWith('ContextWindowStatusButton.tsx')));
});
