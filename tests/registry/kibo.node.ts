import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  readKiboSnapshot,
  parseKiboSnapshot,
  KIBO_SNAPSHOT,
  KIBO_REF,
} from '../../registry/kibo.ts';
import { PROVIDERS, indexPage, licenceFromText } from '../../registry/providers.ts';
import { capturedAssets, seedCaptured } from '../../registry/bootstrap.ts';
import { FetchBudget } from '../../registry/fetcher.ts';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';
import { fingerprint, validateAsset } from '../../registry/domain.ts';
import { resolveAsset } from '../../registry/policy.ts';
import { reviewedPreviewPath } from '../../shared/reviewed-previews.ts';
import {
  syncReviewedProvider,
  assertReviewedDatabaseTarget,
} from '../../registry/reviewed-sync.ts';

const provider = PROVIDERS.find((entry) => entry.id === 'kibo-ui')!;
const body = await readFile(new URL(`../../${KIBO_SNAPSHOT}`, import.meta.url), 'utf8');
async function database() {
  const db = await sqliteDatabase();
  await migrate(db);
  return { db, registry: new Registry(db) };
}

test('reviewed Kibo inventory reconciles 44 packages, 40 React components and ten selected examples', async () => {
  const snapshot = await readKiboSnapshot();
  assert.equal(snapshot.items.length, 10);
  assert.equal(snapshot.inventory.blockedCount, 30);
  assert.equal(snapshot.inventory.excludedCount, 4);
  assert.equal(snapshot.files.length, 58);
  assert.ok(
    snapshot.inventory.records
      .find((item) => item.slug === 'typography')
      ?.reason.includes('CSS-only'),
  );
  assert.ok(
    snapshot.inventory.records
      .find((item) => item.slug === 'choicebox')
      ?.reason.includes('workspace imports'),
  );
  const licence = await readFile(
    new URL('../../data/registry/licences/kibo-ui.txt', import.meta.url),
    'utf8',
  );
  assert.equal(createHash('sha256').update(licence).digest('hex'), snapshot.licence.sha256);
  assert.equal(
    licenceFromText(provider, licence, snapshot.licence.sourceUrl).redistribution,
    'allowed',
  );
  assert.notEqual(
    licenceFromText(provider, `${licence}\nCommons Clause`, snapshot.licence.sourceUrl)
      .redistribution,
    'allowed',
  );
});

test('Kibo parser rejects revision drift, duplicates, oversized inputs, unsafe paths and fabricated previews', () => {
  const mutate = (change: (snapshot: ReturnType<typeof parseKiboSnapshot>) => void) => {
    const snapshot = JSON.parse(body);
    change(snapshot);
    assert.throws(() => parseKiboSnapshot(JSON.stringify(snapshot)));
  };
  assert.throws(() => parseKiboSnapshot('{broken'));
  assert.throws(() => parseKiboSnapshot(' '.repeat(300001)));
  mutate((snapshot) => {
    snapshot.ref = 'a'.repeat(40);
  });
  mutate((snapshot) => {
    snapshot.items[1] = snapshot.items[0];
  });
  mutate((snapshot) => {
    snapshot.files.push(snapshot.files[0]);
  });
  mutate((snapshot) => {
    snapshot.files[0].path = '../escape.tsx';
  });
  mutate((snapshot) => {
    snapshot.items[0].previewPath = '/fake-preview.png';
  });
  mutate((snapshot) => {
    snapshot.items[0].examplePath = snapshot.items[1].examplePath;
  });
  mutate((snapshot) => {
    snapshot.items[0].sourceSha256 = 'a'.repeat(64);
  });
  mutate((snapshot) => {
    snapshot.items[0].category = 'invented';
  });
  mutate((snapshot) => {
    snapshot.items[0].registryUrl = 'https://evil.example/r/a.json';
  });
  mutate((snapshot) => {
    snapshot.items[0].registryDependencies = ['https://evil.example'];
  });
  mutate((snapshot) => {
    snapshot.inventory.blockedCount = 0;
  });
});

test('Kibo indexing is offline, source-pinned, bounded and never crawls unreviewed packages', async () => {
  const budget = new FetchBudget({
    fetchImpl: async () => {
      throw new Error('No network is allowed.');
    },
  });
  const first = await indexPage('kibo-ui', {}, budget);
  assert.equal(first.total, 10);
  assert.equal(first.nextOffset, null);
  assert.equal(first.sourceRef, KIBO_REF);
  assert.equal((await indexPage('kibo-ui', { offset: 10 }, budget)).assets.length, 0);
  await assert.rejects(indexPage('kibo-ui', { offset: -1 }, budget));
  await assert.rejects(
    indexPage('kibo-ui', { sourceRef: 'a'.repeat(40) }, budget),
    /reviewed source snapshot/,
  );
  assert.equal(new Set(first.assets.map((asset) => asset.id)).size, 10);
});

test('each Kibo record retains real source, licence, category, dependencies and its own live preview', async () => {
  const assets = (await capturedAssets()).filter((asset) => asset.providerId === 'kibo-ui');
  const snapshot = await readKiboSnapshot();
  assert.equal(assets.length, 10);
  assert.equal(new Set(assets.map((asset) => asset.preview?.url)).size, 10);
  for (const original of assets) {
    const asset = validateAsset(original);
    const item = snapshot.items.find((entry) => entry.slug === asset.slug)!;
    assert.equal(asset.category, item.category);
    assert.equal(
      asset.sourceUrl,
      `https://github.com/shadcnblocks/kibo/blob/${KIBO_REF}/${item.sourcePath}`,
    );
    assert.equal(asset.variants[0].sourceRef, KIBO_REF);
    assert.equal(asset.preview?.kind, 'embed');
    assert.equal(reviewedPreviewPath(asset), item.previewPath);
    assert.equal(asset.variants[0].dependencyVersions?.react, item.package.dependencies.react);
    assert.equal(resolveAsset(asset).url, item.registryUrl);
    for (const url of [
      `${item.registryUrl}?url=https://evil.example`,
      'https://www.kibo-ui.com/r/unreviewed.json',
      'https://evil.example/r/announcement.json',
    ])
      assert.throws(() =>
        resolveAsset({
          ...asset,
          variants: [{ ...asset.variants[0], acquisition: { kind: 'registry', url } }],
        }),
      );
    assert.equal(
      reviewedPreviewPath({
        ...asset,
        preview: { kind: 'image', url: asset.preview!.url, label: 'Not live' },
      }),
      undefined,
    );
    assert.equal(
      reviewedPreviewPath({
        ...asset,
        preview: { kind: 'embed', url: 'https://evil.example/', label: 'Not reviewed' },
      }),
      undefined,
    );
  }
});

test('additive sync defaults to dry-run, is idempotent and never replaces existing provider assets', async () => {
  const { db, registry } = await database();
  try {
    const plan = await syncReviewedProvider(registry, 'kibo-ui');
    assert.equal(plan.planned, 10);
    assert.equal(plan.inserted, 0);
    assert.equal((await registry.stats()).assets, 0);
    assert.equal((await registry.providers()).length, 0);
    const first = await syncReviewedProvider(registry, 'kibo-ui', {
      apply: true,
      actor: 'test',
      reason: 'Reviewed ten exact source examples.',
    });
    assert.equal(first.inserted, 10);
    const before = await db.query(
      'SELECT payload,fingerprint,updated_at FROM uixo_v2_assets ORDER BY id',
    );
    const second = await syncReviewedProvider(registry, 'kibo-ui', {
      apply: true,
      actor: 'test',
      reason: 'Idempotency check.',
    });
    assert.equal(second.inserted, 0);
    assert.equal(second.unchanged, 10);
    assert.deepEqual(
      await db.query('SELECT payload,fingerprint,updated_at FROM uixo_v2_assets ORDER BY id'),
      before,
    );
    await assert.rejects(syncReviewedProvider(registry, 'shadcn'), /No reviewed additive batch/);
  } finally {
    await db.close();
  }
});

test('additive sync preserves all existing providers, curator edits and provider revocation', async () => {
  const { db, registry } = await database();
  try {
    await seedCaptured(registry);
    const before = await db.query(
      "SELECT id,payload,fingerprint FROM uixo_v2_assets WHERE provider_id<>'kibo-ui' ORDER BY id",
    );
    const edited = await registry.inspect('kibo-ui/announcement');
    const draft = await registry.stage({ ...edited, name: 'Curator supplied title' });
    await registry.review(draft.id, 'approve', 'curator', 'Preserve this correction.');
    await assert.rejects(
      syncReviewedProvider(registry, 'kibo-ui', {
        apply: true,
        actor: 'test',
        reason: 'Must not overwrite.',
      }),
      /will not replace/,
    );
    assert.equal((await registry.inspect(edited.id)).name, 'Curator supplied title');
    assert.deepEqual(
      await db.query(
        "SELECT id,payload,fingerprint FROM uixo_v2_assets WHERE provider_id<>'kibo-ui' ORDER BY id",
      ),
      before,
    );
    await registry.putProvider({ ...provider, approved: false });
    await assert.rejects(syncReviewedProvider(registry, 'kibo-ui'), /revocation/);
  } finally {
    await db.close();
  }
});

test('additive sync refuses existing rejected or pending review histories', async () => {
  const { db, registry } = await database();
  try {
    await registry.putProvider(provider);
    const asset = (await capturedAssets()).find((entry) => entry.providerId === 'kibo-ui')!;
    const draft = await registry.stage(asset);
    await registry.review(
      draft.id,
      'reject',
      'curator',
      'Do not automatically revive this record.',
    );
    await assert.rejects(
      syncReviewedProvider(registry, 'kibo-ui', {
        apply: true,
        actor: 'test',
        reason: 'Must preserve rejection.',
      }),
      /review history/,
    );
    assert.equal((await registry.stats()).assets, 0);
    assert.equal(
      fingerprint(validateAsset(asset)),
      fingerprint(validateAsset(validateAsset(asset))),
    );
  } finally {
    await db.close();
  }
});

test('remote sync target requires exact host/database and explicit branch/deployment confirmation', () => {
  const url =
    'postgresql://operator:secret@ep-example.eu-west-2.aws.neon.tech/neondb?sslmode=require';
  const proof = {
    host: 'ep-example.eu-west-2.aws.neon.tech',
    database: 'neondb',
    neonBranchId: 'br-reviewed-123',
    vercelDeploymentId: 'dpl_Confirmed123',
  };
  assert.equal(assertReviewedDatabaseTarget(url, proof).neonBranchId, proof.neonBranchId);
  for (const missing of Object.keys(proof))
    assert.throws(() => assertReviewedDatabaseTarget(url, { ...proof, [missing]: undefined }));
  assert.throws(() => assertReviewedDatabaseTarget(url, { ...proof, host: 'ep-other.neon.tech' }));
  assert.throws(() => assertReviewedDatabaseTarget(url, { ...proof, database: 'other' }));
});
