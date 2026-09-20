import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capturedAssets } from '../../registry/bootstrap.ts';
import { PROVIDERS } from '../../registry/providers.ts';
import { measureAsset } from '../../registry/intelligence.ts';
import { syncReviewedProvider } from '../../registry/reviewed-sync.ts';
import { sqliteDatabase, migrate } from '../../registry/database.ts';
import { Registry } from '../../registry/service.ts';

test('coverage recognises only the ten reviewed source-pinned local demonstrations', async () => {
  const assets = (await capturedAssets()).filter((asset) => asset.providerId === 'kibo-ui');
  assert.equal(assets.length, 10);
  const index = { captures: {}, live: {} };
  for (const asset of assets) {
    const metrics = measureAsset(asset, index);
    assert.equal(metrics.pinnedLiveDemos, 1);
    assert.equal(metrics.missingPreviews, 0);
    const changed = structuredClone(asset);
    changed.variants[0].sourceRef = 'a'.repeat(40);
    assert.equal(measureAsset(changed, index).pinnedLiveDemos, 0);
    changed.preview!.url = 'https://unreviewed.test/frame';
    assert.equal(measureAsset(changed, index).missingPreviews, 1);
  }
});
test('a concurrent provider insertion or revocation is never overwritten by additive sync', async () => {
  const db = await sqliteDatabase();
  await migrate(db);
  const originalQuery = db.query.bind(db);
  const provider = {
    ...PROVIDERS.find((entry) => entry.id === 'kibo-ui')!,
    name: 'Curator reviewed name',
    approved: false,
  };
  let injected = false;
  db.query = async (sql, args) => {
    if (!injected && sql.startsWith('INSERT INTO uixo_v2_providers')) {
      injected = true;
      await originalQuery(
        'INSERT INTO uixo_v2_providers(id,name,approved,payload,updated_at) VALUES($1,$2,$3,$4,$5)',
        [provider.id, provider.name, 0, JSON.stringify(provider), '2026-09-20T00:00:00Z'],
      );
    }
    return originalQuery(sql, args);
  };
  try {
    await assert.rejects(
      () =>
        syncReviewedProvider(new Registry(db), 'kibo-ui', {
          apply: true,
          actor: 'test',
          reason: 'Concurrent provider acceptance test',
        }),
      /Approved provider not found/,
    );
    const rows = await originalQuery('SELECT * FROM uixo_v2_providers WHERE id=$1', ['kibo-ui']);
    assert.equal(rows[0].name, provider.name);
    assert.equal(Number(rows[0].approved), 0);
    assert.equal(Number((await originalQuery('SELECT COUNT(*) AS n FROM uixo_v2_assets'))[0].n), 0);
  } finally {
    await db.close();
  }
});
