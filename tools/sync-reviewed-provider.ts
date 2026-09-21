import { sqliteDatabase, migrate } from '../registry/database.ts';
import { Registry } from '../registry/service.ts';
import { syncReviewedProvider, assertReviewedDatabaseTarget } from '../registry/reviewed-sync.ts';

const [providerId, ...flags] = process.argv.slice(2);
const permitted = new Set(['--apply', '--allow-remote', '--memory']);
if (
  providerId !== 'kibo-ui' ||
  flags.some((flag) => !permitted.has(flag)) ||
  new Set(flags).size !== flags.length
)
  throw new Error(
    'Usage: node tools/sync-reviewed-provider.ts kibo-ui [--memory] [--apply] [--allow-remote]',
  );
const apply = flags.includes('--apply');
const memory = flags.includes('--memory');
const url = memory ? undefined : process.env.UIXO_DATABASE_URL;
let target;
if (url) {
  if (!flags.includes('--allow-remote')) throw new Error('Remote access requires --allow-remote.');
  target = assertReviewedDatabaseTarget(url, {
    host: process.env.UIXO_EXPECTED_DB_HOST,
    database: process.env.UIXO_EXPECTED_DB_NAME,
    neonBranchId: process.env.UIXO_CONFIRMED_NEON_BRANCH_ID,
    vercelDeploymentId: process.env.UIXO_CONFIRMED_VERCEL_DEPLOYMENT_ID,
  });
} else if (!memory)
  throw new Error('Set the verified UIXO_DATABASE_URL or explicitly use --memory.');
const db = url
  ? await (await import('../registry/postgres.ts')).postgresDatabase(url)
  : await sqliteDatabase();
try {
  // Only the explicitly disposable in-memory database is migrated here.
  if (memory) await migrate(db);
  const result = await syncReviewedProvider(new Registry(db), providerId, {
    apply,
    actor: process.env.UIXO_OPERATOR_ID ?? (memory ? 'local-preview-audit' : undefined),
    reason:
      process.env.UIXO_REVIEW_REASON ??
      (memory ? 'Disposable local reviewed preview verification.' : undefined),
  });
  console.log(JSON.stringify({ target: target ?? 'disposable-memory', ...result }, null, 2));
} finally {
  await db.close();
}
