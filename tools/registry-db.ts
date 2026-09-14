import { migrate, sqliteDatabase } from '../registry/database.ts';
import { Registry } from '../registry/service.ts';
import { seedCaptured, syncCaptured } from '../registry/bootstrap.ts';
import { enqueue, runJob } from '../registry/jobs.ts';
const [command, provider] = process.argv.slice(2);
if (!['migrate', 'seed', 'sync', 'index'].includes(command))
  throw new Error('Usage: registry-db.ts migrate|seed|sync|index [provider-id]');
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
  if (command === 'seed') console.log(JSON.stringify(await seedCaptured(registry)));
  if (command === 'sync') console.log(JSON.stringify(await syncCaptured(registry)));
  if (command === 'index') {
    if (!provider) throw new Error('Provider ID required.');
    const job = await enqueue(registry, provider);
    console.log(JSON.stringify(await runJob(registry, job.id)));
  }
} finally {
  await db.close();
}
