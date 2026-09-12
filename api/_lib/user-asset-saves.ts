import { normalizeAssetIds } from '../../src/lib/asset-saves.js';
import { db } from './db.js';

export type UserAssetSaveSnapshot = { assetIds: string[]; revision: number };
export type UserAssetSaveWrite =
  { ok: true; snapshot: UserAssetSaveSnapshot } | { ok: false; snapshot: UserAssetSaveSnapshot };

export async function readUserAssetSaves(userId: string): Promise<UserAssetSaveSnapshot> {
  const sql = db();
  const [row] = await sql`
    select asset_ids, revision from user_asset_saves where user_id = ${userId}::uuid limit 1`;
  if (!row) return { assetIds: [], revision: 0 };
  return {
    assetIds: normalizeAssetIds(row.asset_ids) ?? [],
    revision: Number(row.revision) || 0,
  };
}

export async function writeUserAssetSaves(
  userId: string,
  input: unknown,
  expectedRevision: number,
): Promise<UserAssetSaveWrite | null> {
  const assetIds = normalizeAssetIds(input);
  if (!assetIds) return null;

  const sql = db();
  const knownRows = assetIds.length
    ? await sql`select id from uixo_v2_assets where id = any(${assetIds}::text[])`
    : [];
  const known = new Set(knownRows.map((row) => String(row.id)));
  const stored = assetIds.filter((id) => known.has(id));

  const [written] = await sql`
    insert into user_asset_saves (user_id, asset_ids, revision, updated_at)
    select ${userId}::uuid, ${JSON.stringify(stored)}::jsonb, 1, now()
    where ${expectedRevision} = 0
    on conflict (user_id) do update
    set asset_ids = excluded.asset_ids,
        revision = user_asset_saves.revision + 1,
        updated_at = excluded.updated_at
    where user_asset_saves.revision = ${expectedRevision}
    returning asset_ids, revision`;

  if (!written) return { ok: false, snapshot: await readUserAssetSaves(userId) };
  return {
    ok: true,
    snapshot: {
      assetIds: normalizeAssetIds(written.asset_ids) ?? stored,
      revision: Number(written.revision),
    },
  };
}
