import { readFile } from 'node:fs/promises';
import type { Asset } from './domain.ts';
import { componentAsset, iconAsset, licenceFromText, PROVIDERS } from './providers.ts';
import type { Registry } from './service.ts';

export async function capturedAssets(): Promise<Asset[]> {
  const captured = JSON.parse(
    await readFile(new URL('../data/registry/captured.json', import.meta.url), 'utf8'),
  ) as {
    capturedAt: string;
    components: [string, string[]][];
    lucide: string[];
    heroicons: string[];
  };
  const assets: Asset[] = [];
  for (const provider of PROVIDERS) {
    const ref = provider.id === 'heroicons' ? 'master' : 'main';
    const body = await readFile(
      new URL(`../data/registry/licences/${provider.id}.txt`, import.meta.url),
      'utf8',
    );
    const licence = licenceFromText(
      provider,
      body,
      `https://github.com/${provider.repo}/blob/${ref}/${provider.id === 'shadcn' ? 'LICENSE.md' : 'LICENSE'}`,
      captured.capturedAt,
    );
    if (provider.id === 'shadcn')
      for (const [name, deps] of captured.components)
        assets.push(componentAsset(name, deps, provider, licence, ref, captured.capturedAt));
    else
      for (const name of captured[provider.id as 'lucide' | 'heroicons'])
        assets.push(
          iconAsset(
            provider,
            `${provider.id === 'lucide' ? 'icons' : 'optimized/24/outline'}/${name}.svg`,
            ref,
            licence,
            captured.capturedAt,
          ),
        );
  }
  // A branch locator is not an immutable package/version reference.
  for (const asset of assets) {
    asset.variants.forEach((v) => {
      v.sourceRef = null;
    });
    asset.evidence.forEach((e) => {
      e.reference = null;
      e.method = 'declared';
    });
    asset.licence = {
      ...asset.licence,
      note:
        asset.licence.note +
        ' This bootstrap record was captured from a mutable source branch. Re-index for a commit-pinned acquisition.',
    };
  }
  return assets;
}
export async function seedCaptured(registry: Registry) {
  for (const provider of PROVIDERS) {
    await registry.db.query(
      'INSERT INTO uixo_v2_providers(id,name,approved,payload,updated_at) VALUES($1,$2,1,$3,$4) ON CONFLICT(id) DO NOTHING',
      [provider.id, provider.name, JSON.stringify(provider), new Date().toISOString()],
    );
  }
  const assets = await capturedAssets();
  let inserted = 0;
  for (const asset of assets) {
    const published = await registry.db.query('SELECT id FROM uixo_v2_assets WHERE id=$1', [
      asset.id,
    ]);
    const provider = await registry.db.query('SELECT approved FROM uixo_v2_providers WHERE id=$1', [
      asset.providerId,
    ]);
    if (published.length || Number(provider[0]?.approved) !== 1) continue;
    const staged = await registry.stage(asset);
    if (staged.created) {
      await registry.review(
        staged.id,
        'approve',
        'bootstrap-source-snapshot',
        'Publish captured source metadata for evaluation. Not an individual editorial endorsement.',
      );
      inserted++;
    }
  }
  return { inserted, sourceAssets: assets.length, mode: 'captured-source-snapshot' };
}
