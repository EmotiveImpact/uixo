import { randomUUID } from 'node:crypto';
import { STARTER_COLLECTIONS } from '../shared/starter-collections.ts';
import type { Asset } from './domain.ts';
import type { PublicCollectionItem } from '../shared/intelligence.ts';
import type {
  CollectionInput,
  CollectionRecord,
  PublicCollection,
} from '../shared/intelligence.ts';
import type { Registry } from './service.ts';
import type { Row, Statement } from './database.ts';
import { RegistryError, identifier, integer, record, text } from './domain.ts';

export function requireWritable(registry: Registry) {
  if (registry.db.mode === 'snapshot')
    throw new RegistryError(
      'READ_ONLY_SNAPSHOT',
      'Configure a persistent registry database before changing editorial state.',
      503,
    );
}
export function collectionSlug(value: unknown): string {
  const slug = text(value, 80);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug))
    throw new RegistryError(
      'INVALID_INPUT',
      'Use a lowercase collection slug with letters, numbers and hyphens.',
    );
  return slug;
}
export function parseCollection(input: unknown): CollectionInput {
  const raw = record(input);
  if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > 48)
    throw new RegistryError('INVALID_INPUT', 'A collection needs 1 to 48 typed items.');
  const items = raw.items.map((item) => {
    const x = record(item);
    if (x.kind !== 'asset' && x.kind !== 'provider')
      throw new RegistryError('INVALID_INPUT', 'Collection items must be assets or providers.');
    return {
      kind: x.kind as 'asset' | 'provider',
      targetId: identifier(x.targetId),
      note: text(x.note, 1200, true),
    };
  });
  if (new Set(items.map((i) => i.kind + ':' + i.targetId)).size !== items.length)
    throw new RegistryError('INVALID_INPUT', 'A collection cannot repeat the same typed item.');
  return {
    slug: collectionSlug(raw.slug),
    title: text(raw.title, 150),
    description: text(raw.description, 3000),
    items,
  };
}
/** Resolve each typed target once across a page. Avoid a remote query per collection item. */
async function targets(registry: Registry, collections: CollectionInput[]) {
  const found = new Map<string, Omit<PublicCollectionItem, 'kind' | 'targetId' | 'note'>>();
  for (const kind of ['asset', 'provider'] as const) {
    const ids = [
      ...new Set(
        collections.flatMap((c) => c.items.filter((i) => i.kind === kind).map((i) => i.targetId)),
      ),
    ];
    for (let start = 0; start < ids.length; start += 256) {
      const chunk = ids.slice(start, start + 256);
      const placeholders = chunk.map((_, i) => `$${i + 1}`).join(',');
      const rows = await registry.db.query(
        kind === 'asset'
          ? `SELECT a.id,a.name,a.source_url AS source_url,a.payload,p.name AS provider_name FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE p.approved=1 AND a.id IN (${placeholders})`
          : `SELECT id,payload FROM uixo_v2_providers WHERE approved=1 AND id IN (${placeholders})`,
        chunk,
      );
      for (const row of rows) {
        const value =
          kind === 'asset'
            ? (() => {
                const asset = JSON.parse(String(row.payload)) as Asset;
                return {
                  name: asset.name,
                  sourceUrl: asset.sourceUrl,
                  providerId: asset.providerId,
                  providerName: String(row.provider_name),
                  frameworks: [...new Set(asset.variants.map((variant) => variant.framework))],
                  licenceExpression: asset.licence.expression,
                  asset: {
                    id: asset.id,
                    providerId: asset.providerId,
                    name: asset.name,
                    kind: asset.kind,
                    sourceUrl: asset.sourceUrl,
                    preview: asset.preview,
                  },
                };
              })()
            : (() => {
                const provider = JSON.parse(String(row.payload));
                return { name: String(provider.name), sourceUrl: String(provider.url) };
              })();
        found.set(`${kind}:${row.id}`, value);
      }
    }
  }
  return found;
}
function resolvedItems(collection: CollectionInput, found: Awaited<ReturnType<typeof targets>>) {
  return collection.items.flatMap((item) => {
    const target = found.get(`${item.kind}:${item.targetId}`);
    return target ? [{ ...item, ...target }] : [];
  });
}
async function available(registry: Registry, collection: CollectionInput) {
  return resolvedItems(collection, await targets(registry, [collection]));
}
async function serialiseCollections(
  registry: Registry,
  rows: Row[],
  editor: boolean,
): Promise<Array<CollectionRecord | PublicCollection>> {
  if (editor)
    return rows.map((row) => ({
      ...JSON.parse(String(row.payload)),
      revision: Number(row.revision),
      publishedRevision: row.published_revision === null ? null : Number(row.published_revision),
      hasUnpublishedChanges: row.payload !== row.published_payload,
      updatedAt: String(row.updated_at),
    }));
  const contents = rows.map((row) => JSON.parse(String(row.published_payload)) as CollectionInput);
  const found = await targets(registry, contents);
  return contents.map((content, index) => {
    const items = resolvedItems(content, found);
    return {
      ...content,
      items,
      revision: Number(rows[index].published_revision),
      unavailableItems: content.items.length - items.length,
    };
  });
}
export async function getCollection(
  registry: Registry,
  slug: string,
  editor = false,
): Promise<CollectionRecord | PublicCollection> {
  const rows = await registry.db.query(
    `SELECT * FROM uixo_v2_collections WHERE slug=$1 ${editor ? '' : 'AND published_payload IS NOT NULL'}`,
    [collectionSlug(slug)],
  );
  if (!rows.length) throw new RegistryError('NOT_FOUND', 'Collection not found.', 404);
  return (await serialiseCollections(registry, rows, editor))[0];
}
export async function listCollections(registry: Registry, editor = false, limit = 24, offset = 0) {
  limit = integer(limit, 24, 1, 48);
  offset = integer(offset, 0, 0, 100000);
  const where = editor ? '1=1' : 'published_payload IS NOT NULL';
  const [rows, counts] = await Promise.all([
    registry.db.query(
      `SELECT * FROM uixo_v2_collections WHERE ${where} ORDER BY slug LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    registry.db.query(`SELECT COUNT(*) AS count FROM uixo_v2_collections WHERE ${where}`),
  ]);
  const items = await serialiseCollections(registry, rows, editor);
  const total = Number(counts[0].count);
  return { items, total, nextOffset: offset + items.length < total ? offset + items.length : null };
}
export async function saveCollection(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const raw = record(input),
    content = parseCollection(raw),
    expected = integer(raw.expectedRevision, 0, 0, 1000000);
  if ((await available(registry, content)).length !== content.items.length)
    throw new RegistryError(
      'INVALID_REFERENCE',
      'Every collection item must reference a published asset or an approved provider.',
      409,
    );
  const token = randomUUID(),
    now = new Date().toISOString();
  const guard = 'EXISTS(SELECT 1 FROM uixo_v2_collections WHERE slug=$1 AND mutation_token=$2)';
  const statements: Statement[] = [
    {
      sql: 'INSERT INTO uixo_v2_collections(slug,payload,revision,updated_at,updated_by,mutation_token) SELECT $1,$2,1,$3,$4,$5 WHERE $6=0 OR EXISTS(SELECT 1 FROM uixo_v2_collections WHERE slug=$1) ON CONFLICT(slug) DO UPDATE SET payload=excluded.payload,revision=uixo_v2_collections.revision+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by,mutation_token=excluded.mutation_token WHERE uixo_v2_collections.revision=$6 RETURNING slug',
      args: [content.slug, JSON.stringify(content), now, actor, token, expected],
    },
    {
      sql: `DELETE FROM uixo_v2_collection_items WHERE collection_slug=$1 AND ${guard}`,
      args: [content.slug, token],
    },
  ];
  content.items.forEach((item, position) =>
    statements.push({
      sql: `INSERT INTO uixo_v2_collection_items(collection_slug,position,kind,target_id,note) SELECT $1,$3,$4,$5,$6 WHERE ${guard}`,
      args: [content.slug, token, position, item.kind, item.targetId, item.note],
    }),
  );
  statements.push({
    sql: `INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $3,$4,'collection-save',$1,$5,$6 WHERE ${guard}`,
    args: [
      content.slug,
      token,
      randomUUID(),
      actor,
      JSON.stringify({ expectedRevision: expected }),
      now,
    ],
  });
  const result = await registry.db.batch(statements);
  if (!result[0].length)
    throw new RegistryError(
      'CONFLICT',
      'The collection changed. Reload before saving; your draft has not overwritten another edit.',
      409,
    );
  return getCollection(registry, content.slug, true);
}
export async function publishCollection(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const raw = record(input),
    slug = collectionSlug(raw.slug),
    expected = integer(raw.expectedRevision, -1, 1, 1000000);
  const decision = text(raw.decision, 20),
    reason = text(raw.reason, 2000);
  if (!['publish', 'unpublish'].includes(decision) || reason.length < 10)
    throw new RegistryError(
      'INVALID_INPUT',
      'Choose publish or unpublish and give a reason of at least ten characters.',
    );
  const token = randomUUID(),
    now = new Date().toISOString();
  const validItems = `NOT EXISTS(SELECT 1 FROM uixo_v2_collection_items i WHERE i.collection_slug=$1 AND ((i.kind='asset' AND NOT EXISTS(SELECT 1 FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE a.id=i.target_id AND p.approved=1)) OR (i.kind='provider' AND NOT EXISTS(SELECT 1 FROM uixo_v2_providers p WHERE p.id=i.target_id AND p.approved=1))))`;
  const result = await registry.db.batch([
    {
      sql: `UPDATE uixo_v2_collections SET published_payload=${decision === 'publish' ? 'payload' : 'NULL'},published_revision=${decision === 'publish' ? 'revision+1' : 'NULL'},revision=revision+1,updated_at=$3,updated_by=$4,mutation_token=$5 WHERE slug=$1 AND revision=$2 ${decision === 'publish' ? 'AND ' + validItems : ''} RETURNING slug`,
      args: [slug, expected, now, actor, token],
    },
    {
      sql: 'INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $1,$2,$3,$4,$5,$6 WHERE EXISTS(SELECT 1 FROM uixo_v2_collections WHERE slug=$4 AND mutation_token=$7)',
      args: [
        randomUUID(),
        actor,
        'collection-' + decision,
        slug,
        JSON.stringify({ reason }),
        now,
        token,
      ],
    },
  ]);
  if (!result[0].length)
    throw new RegistryError(
      'CONFLICT',
      'The collection or its source availability changed. Reload and review before publication.',
      409,
    );
  return getCollection(registry, slug, true);
}
/** Starter selections are drafts, never implicitly public. Safe to rerun without editing existing work. */
export async function seedCollectionDrafts(registry: Registry) {
  requireWritable(registry);
  let inserted = 0;
  const skipped: string[] = [];
  for (const starter of STARTER_COLLECTIONS) {
    if (
      (
        await registry.db.query('SELECT slug FROM uixo_v2_collections WHERE slug=$1', [
          starter.slug,
        ])
      ).length
    )
      continue;
    if ((await available(registry, starter)).length !== starter.items.length) {
      skipped.push(starter.slug);
      continue;
    }
    await saveCollection(registry, { ...starter, expectedRevision: 0 }, 'collection-bootstrap');
    inserted++;
  }
  return { inserted, published: 0, skipped };
}
