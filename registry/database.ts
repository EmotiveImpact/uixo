import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export type Row = Record<string, unknown>;
export type Statement = { sql: string; args?: (string | number | null)[] };
export interface Database {
  mode: 'sqlite' | 'postgres' | 'snapshot';
  query(sql: string, args?: (string | number | null)[]): Promise<Row[]>;
  batch(statements: Statement[]): Promise<Row[][]>;
  close(): Promise<void>;
}
export async function sqliteDatabase(path = ':memory:', snapshot = false): Promise<Database> {
  const { DatabaseSync } = await import('node:sqlite');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  const run = (sql: string, args: (string | number | null)[] = []): Row[] => {
    const ordered: (string | number | null)[] = [];
    const translated = sql.replace(/\$(\d+)/g, (_, n: string) => {
      ordered.push(args[Number(n) - 1]);
      return '?';
    });
    return db.prepare(translated).all(...ordered) as Row[];
  };
  return {
    mode: snapshot ? 'snapshot' : 'sqlite',
    async query(sql, args) {
      return run(sql, args);
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = statements.map((s) => run(s.sql, s.args));
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async close() {
      db.close();
    },
  };
}
export async function migrate(db: Database) {
  const source = await readFile(
    new URL('../db/migrations/002-registry.sql', import.meta.url),
    'utf8',
  );
  const statements = source
    .split(';')
    .map((sql) => sql.trim())
    .filter(Boolean)
    .map((sql) => ({ sql }));
  await db.batch(statements);
}
