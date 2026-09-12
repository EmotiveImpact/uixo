import type { Database, Row } from './database.ts';

export async function postgresDatabase(url: string): Promise<Database> {
  // The production driver already exists in the UIXO application. Never send this URL to clients.
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  return {
    mode: 'postgres',
    async query(query, args = []) {
      return (await sql.query(query, args)) as Row[];
    },
    async batch(statements) {
      return (await sql.transaction(
        statements.map((s) => sql.query(s.sql, s.args ?? [])),
      )) as Row[][];
    },
    async close() {},
  };
}
