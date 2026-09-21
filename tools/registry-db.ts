import { publishNewStarterCollections } from '../registry/release-collections.ts';
import { intelligenceReadiness } from '../registry/readiness.ts';
import { seedCollectionDrafts } from '../registry/collections.ts';
import { migrate, sqliteDatabase } from '../registry/database.ts';
import { Registry } from '../registry/service.ts';
import { seedCaptured, syncCaptured } from '../registry/bootstrap.ts';
import { enqueue, runJob } from '../registry/jobs.ts';
const args = process.argv.slice(2);
const command = args[0];
const provider = args.slice(1).find((argument) => !argument.startsWith('--'));
if (
  ![
    'migrate',
    'seed',
    'sync',
    'sync-provider',
    'index',
    'collections-seed',
    'readiness',
    'collections-publish-new',
  ].includes(command)
)
  throw new Error(
    'Usage: registry-db.ts migrate|seed|sync|sync-provider|index|collections-seed|readiness|collections-publish-new [provider-id]',
  );
if (process.env.UIXO_DATABASE_URL && !process.argv.includes('--allow-remote'))
  throw new Error(
    'Remote database writes require --allow-remote. Use a dedicated registry development database first.',
  );
const db = process.env.UIXO_DATABASE_URL
  ? await (await import('../registry/postgres.ts')).postgresDatabase(process.env.UIXO_DATABASE_URL)
  : await sqliteDatabase('.uixo/registry.sqlite');
try {
  const registry = new Registry(db);
  if (command === 'migrate') {
    await migrate(db);
    console.log('Registry migration complete.');
  }
  if (command === 'readiness') console.log(JSON.stringify(await intelligenceReadiness(registry)));
  if (command === 'collections-publish-new') {
    const actor = process.env.UIXO_OPERATOR_ID || '';
    const reason = process.env.UIXO_EDITORIAL_REASON || '';
    if (!process.argv.includes('--publish-reviewed'))
      throw new Error(
        'Explicit --publish-reviewed acknowledgement, UIXO_OPERATOR_ID and UIXO_EDITORIAL_REASON are required. Existing drafts and withdrawals are never overwritten.',
      );
    console.log(JSON.stringify(await publishNewStarterCollections(registry, actor, reason)));
  }
  if (command === 'collections-seed')
    console.log(JSON.stringify(await seedCollectionDrafts(registry)));
  if (command === 'seed') console.log(JSON.stringify(await seedCaptured(registry)));
  if (command === 'sync') console.log(JSON.stringify(await syncCaptured(registry)));
  if (command === 'sync-provider') {
    if (!provider) throw new Error('Provider ID required.');
    console.log(JSON.stringify(await syncCaptured(registry, new Set([provider]))));
  }
  if (command === 'index') {
    if (!provider) throw new Error('Provider ID required.');
    const job = await enqueue(registry, provider);
    console.log(JSON.stringify(await runJob(registry, job.id)));
  }
} finally {
  await db.close();
}
