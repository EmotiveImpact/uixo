import { neon } from '@neondatabase/serverless';

type Row = Record<string, unknown>;
/** Tagged-template query returning plain rows — the shape every endpoint here expects. */
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

/**
 * Lazily created so importing this module never throws at build time, when DATABASE_URL is
 * not yet in the environment.
 */
let client: Sql | null = null;

export function db(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url) as unknown as Sql;
  }
  return client;
}

export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
