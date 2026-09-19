import type { Registry } from './service.ts';

const INTELLIGENCE_TABLES = [
  'uixo_v2_candidate_work',
  'uixo_v2_candidate_jobs',
  'uixo_v2_job_revisions',
  'uixo_v2_scout_deliveries',
  'uixo_v2_collections',
  'uixo_v2_collection_items',
  'uixo_v2_github_issues',
];

/** Read-only readiness, not a migration. Do not return database hosts or credentials. */
export async function intelligenceReadiness(registry: Registry) {
  const placeholders = INTELLIGENCE_TABLES.map((_, i) => '$' + (i + 1)).join(',');
  const sql = registry.db.mode === 'postgres'
    ? 'SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN (' + placeholders + ')'
    : "SELECT name FROM sqlite_master WHERE type='table' AND name IN (" + placeholders + ')';
  const rows = await registry.db.query(sql, INTELLIGENCE_TABLES);
  const found = new Set(rows.map((row) => String(row.name)));
  return {
    ready: INTELLIGENCE_TABLES.every((name) => found.has(name)),
    migration: '004-intelligence' as const,
    mode: registry.db.mode === 'snapshot' ? 'read-only-evaluation' as const : 'persistent' as const,
  };
}
