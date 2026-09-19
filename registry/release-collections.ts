import { randomUUID } from 'node:crypto';
import { STARTER_COLLECTIONS } from '../shared/starter-collections.ts';
import type { Registry } from './service.ts';
import type { Statement } from './database.ts';
import { RegistryError } from './domain.ts';
import { saveCollection, publishCollection } from './collections.ts';

/** The evaluation catalogue includes release-authored editorial selections.
 * This is not an HTTP mutation or an activation path for a persistent database.
 * As with seedCaptured, snapshot bootstrap constructs the read-only published dataset.
 */
export async function bootstrapSnapshotCollections(registry: Registry) {
  if (registry.db.mode !== 'snapshot')
    throw new RegistryError(
      'SNAPSHOT_ONLY',
      'Snapshot editorial bootstrap cannot target persistent storage.',
      403,
    );
  let published = 0;
  for (const collection of STARTER_COLLECTIONS) {
    if (
      (
        await registry.db.query('SELECT slug FROM uixo_v2_collections WHERE slug=$1', [
          collection.slug,
        ])
      ).length
    )
      continue;
    // inspect enforces approved providers and published records. Missing members fail the
    // entire selection rather than advertising an incomplete or invented collection.
    for (const item of collection.items) await registry.inspect(item.targetId);
    const now = new Date().toISOString();
    const token = randomUUID();
    const payload = JSON.stringify(collection);
    const actor = 'release:discovery-v2';
    const guard = 'EXISTS(SELECT 1 FROM uixo_v2_collections WHERE slug=$1 AND mutation_token=$2)';
    const statements: Statement[] = [
      {
        sql: 'INSERT INTO uixo_v2_collections(slug,payload,revision,published_payload,published_revision,updated_at,updated_by,mutation_token) VALUES($1,$2,1,$2,1,$3,$4,$5) ON CONFLICT(slug) DO NOTHING RETURNING slug',
        args: [collection.slug, payload, now, actor, token],
      },
    ];
    collection.items.forEach((item, position) =>
      statements.push({
        sql:
          'INSERT INTO uixo_v2_collection_items(collection_slug,position,kind,target_id,note) SELECT $1,$3,$4,$5,$6 WHERE ' +
          guard,
        args: [collection.slug, token, position, item.kind, item.targetId, item.note],
      }),
    );
    statements.push({
      sql:
        'INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $3,$4,$5,$1,$6,$7 WHERE ' +
        guard,
      args: [
        collection.slug,
        token,
        randomUUID(),
        actor,
        'collection-publish',
        JSON.stringify({
          reason:
            'Release-authored source-backed selection for the read-only evaluation catalogue.',
          manifest: 'shared/starter-collections.ts',
          mode: 'snapshot',
        }),
        now,
      ],
    });
    const results = await registry.db.batch(statements);
    if (results[0].length) published++;
  }
  return { published, mode: 'snapshot' as const };
}

/** Explicit operator publication only. Existing drafts, publications and withdrawals are
 * never overwritten or republished by this command. There is deliberately no HTTP route.
 */
export async function publishNewStarterCollections(
  registry: Registry,
  actor: string,
  reason: string,
) {
  if (registry.db.mode === 'snapshot')
    throw new RegistryError(
      'PERSISTENT_REQUIRED',
      'Use persistent storage for operator publication.',
      403,
    );
  if (!actor.trim() || reason.trim().length < 10)
    throw new RegistryError(
      'INVALID_INPUT',
      'An operator identity and a meaningful review reason are required.',
    );
  let published = 0;
  const skipped: string[] = [];
  for (const collection of STARTER_COLLECTIONS) {
    if (
      (
        await registry.db.query('SELECT slug FROM uixo_v2_collections WHERE slug=$1', [
          collection.slug,
        ])
      ).length
    ) {
      skipped.push(collection.slug);
      continue;
    }
    const saved = await saveCollection(registry, { ...collection, expectedRevision: 0 }, actor);
    await publishCollection(
      registry,
      {
        slug: collection.slug,
        expectedRevision: saved.revision,
        decision: 'publish',
        reason,
      },
      actor,
    );
    published++;
  }
  return { published, skipped };
}
