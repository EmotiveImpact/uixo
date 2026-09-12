import { sqliteDatabase, migrate } from './database.ts';
import { Registry } from './service.ts';
import { seedCaptured } from './bootstrap.ts';
let current: Promise<Registry> | undefined;
export function getRegistry(): Promise<Registry> {
  current ??= initialise().catch((error) => { current = undefined; throw error; });
  return current;
}
async function initialise(): Promise<Registry> {
  if (process.env.UIXO_DATABASE_URL) {
    const { postgresDatabase } = await import('./postgres.ts');
    // Migrations are an explicit operator command, never a side effect of a public request.
    return new Registry(await postgresDatabase(process.env.UIXO_DATABASE_URL));
  }
  // A source-backed read-only evaluation catalogue remains available without credentials.
  // In-memory SQLite is not used for production mutations or durable job claims.
  const db = await sqliteDatabase(':memory:', true);
  await migrate(db);
  const registry = new Registry(db);
  await seedCaptured(registry);
  return registry;
}
