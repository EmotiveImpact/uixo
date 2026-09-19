import { randomUUID } from 'node:crypto';
import { COMPONENT_CATEGORIES } from '../shared/component-categories.ts';
import type { Database, Statement } from './database.ts';
import {
  type Asset,
  type Provider,
  type Search,
  RegistryError,
  fingerprint,
  identifier,
  parseScout,
  parseSearch,
  validateAsset,
} from './domain.ts';

export class Registry {
  db: Database;
  constructor(db: Database) {
    this.db = db;
  }
  async putProvider(provider: Provider) {
    await this.db.query(
      'INSERT INTO uixo_v2_providers(id,name,approved,payload,updated_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=excluded.name,approved=excluded.approved,payload=excluded.payload,updated_at=excluded.updated_at',
      [
        provider.id,
        provider.name,
        provider.approved ? 1 : 0,
        JSON.stringify(provider),
        new Date().toISOString(),
      ],
    );
  }
  async providers() {
    const rows = await this.db.query(
      "SELECT p.payload, (SELECT COUNT(*) FROM uixo_v2_assets a WHERE a.provider_id=p.id AND a.kind<>'icon') AS asset_count FROM uixo_v2_providers p WHERE p.approved=1 ORDER BY p.name",
    );
    return rows.map((r) => ({
      ...(JSON.parse(String(r.payload)) as Provider),
      assetCount: Number(r.asset_count),
    }));
  }
  async inventory() {
    const published =
      "FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE p.approved=1 AND a.kind<>'icon'";
    const facet = async (column: 'kind' | 'provider_id' | 'price') =>
      (
        await this.db.query(
          `SELECT a.${column} AS value, COUNT(*) AS count ${published} GROUP BY a.${column} ORDER BY count DESC,a.${column}`,
        )
      ).map((row) => ({ id: String(row.value), count: Number(row.count) }));
    const variants = async (column: 'framework' | 'format') =>
      (
        await this.db.query(
          `SELECT v.${column} AS value, COUNT(DISTINCT a.id) AS count FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id JOIN uixo_v2_variants v ON v.asset_id=a.id WHERE p.approved=1 AND a.kind<>'icon' GROUP BY v.${column} ORDER BY count DESC,v.${column}`,
        )
      ).map((row) => ({ id: String(row.value), count: Number(row.count) }));
    const categorySql = COMPONENT_CATEGORIES.map(
      (entry) =>
        `SELECT '${entry.id}' AS value, COUNT(*) AS count ${published} AND a.kind='component' AND a.search_text LIKE '%category:${entry.id}:%'`,
    ).join(' UNION ALL ');
    const [kinds, providers, prices, frameworks, formats, categoryRows, commercialRows] =
      await Promise.all([
        facet('kind'),
        facet('provider_id'),
        facet('price'),
        variants('framework'),
        variants('format'),
        this.db.query(categorySql),
        this.db.query(
          "SELECT COUNT(*) AS count FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id JOIN uixo_v2_licences l ON l.id=a.licence_id WHERE p.approved=1 AND a.kind<>'icon' AND l.commercial='allowed'",
        ),
      ]);
    const categories = categoryRows.map((row) => ({
      id: String(row.value),
      count: Number(row.count),
    }));
    return {
      total: kinds.reduce((sum, entry) => sum + entry.count, 0),
      kinds,
      providers,
      frameworks,
      formats,
      prices,
      categories,
      commercialUse: Number(commercialRows[0]?.count ?? 0),
    };
  }
  async provider(id: string): Promise<Provider> {
    const rows = await this.db.query(
      'SELECT payload FROM uixo_v2_providers WHERE id=$1 AND approved=1',
      [identifier(id)],
    );
    if (!rows.length) throw new RegistryError('NOT_FOUND', 'Approved provider not found.', 404);
    return JSON.parse(String(rows[0].payload)) as Provider;
  }
  async stage(input: unknown, refreshUnchanged = false): Promise<{ id: string; created: boolean }> {
    const asset = validateAsset(input);
    await this.provider(asset.providerId);
    const fp = fingerprint(asset),
      id = randomUUID();
    const live = await this.db.query('SELECT fingerprint FROM uixo_v2_assets WHERE id=$1', [
      asset.id,
    ]);
    const payload = JSON.stringify({ ...asset, _baseFingerprint: live[0]?.fingerprint ?? null });
    const rows = await this.db.query(
      "INSERT INTO uixo_v2_revisions(id,provider_id,asset_id,fingerprint,payload,status,created_at) VALUES($1,$2,$3,$4,$5,'pending',$6) ON CONFLICT(asset_id,fingerprint) DO NOTHING RETURNING id",
      [id, asset.providerId, asset.id, fp, payload, new Date().toISOString()],
    );
    if (rows.length) return { id, created: true };
    if (refreshUnchanged && live[0]?.fingerprint === fp) {
      await this.db.query(
        'UPDATE uixo_v2_assets SET payload=$3,updated_at=$4 WHERE id=$1 AND fingerprint=$2',
        [asset.id, fp, JSON.stringify(asset), new Date().toISOString()],
      );
    }
    const prior = await this.db.query(
      'SELECT id FROM uixo_v2_revisions WHERE asset_id=$1 AND fingerprint=$2',
      [asset.id, fp],
    );
    return { id: String(prior[0].id), created: false };
  }
  async queue(limit = 48, offset = 0) {
    const rows = await this.db.query(
      "SELECT id,payload,status,created_at,reason FROM uixo_v2_revisions WHERE status='pending' ORDER BY created_at,id LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    const count = await this.db.query(
      "SELECT COUNT(*) AS count FROM uixo_v2_revisions WHERE status='pending'",
    );
    return {
      total: Number(count[0].count),
      items: rows.map((row) => ({
        id: row.id,
        asset: JSON.parse(String(row.payload)) as Asset,
        status: row.status,
        createdAt: row.created_at,
        reason: row.reason,
      })),
    };
  }
  async review(id: string, decision: 'approve' | 'reject', actor: string, reason: string) {
    const rows = await this.db.query(
      "SELECT * FROM uixo_v2_revisions WHERE id=$1 AND status='pending'",
      [id],
    );
    if (!rows.length)
      throw new RegistryError(
        'CONFLICT',
        'This revision was already reviewed or does not exist.',
        409,
      );
    const raw = JSON.parse(String(rows[0].payload));
    const asset = validateAsset(raw);
    const baseFingerprint = typeof raw._baseFingerprint === 'string' ? raw._baseFingerprint : null;
    await this.provider(asset.providerId);
    const now = new Date().toISOString();
    // A one-row claim is the first statement. Subsequent writes are conditional on this
    // unique review token, so two reviewers cannot both publish or audit a revision.
    const reviewToken = `${actor}:${randomUUID()}`;
    const statements: Statement[] = [
      {
        sql: "UPDATE uixo_v2_revisions SET status=$1,reason=$2,reviewer=$3,reviewed_at=$4 WHERE id=$5 AND status='pending' AND ($6='reject' OR COALESCE((SELECT fingerprint FROM uixo_v2_assets WHERE id=$7),'')=COALESCE($8,'')) AND EXISTS(SELECT 1 FROM uixo_v2_providers WHERE id=$9 AND approved=1) RETURNING id",
        args: [
          decision === 'approve' ? 'approved' : 'rejected',
          reason,
          reviewToken,
          now,
          id,
          decision,
          asset.id,
          baseFingerprint,
          asset.providerId,
        ],
      },
    ];
    const guard = 'EXISTS(SELECT 1 FROM uixo_v2_revisions WHERE id=$1 AND reviewer=$2)';
    if (decision === 'approve') {
      statements.push({
        sql: `INSERT INTO uixo_v2_licences(id,expression,commercial,redistribution,payload) SELECT $3,$4,$5,$6,$7 WHERE ${guard} ON CONFLICT(id) DO UPDATE SET expression=excluded.expression,commercial=excluded.commercial,redistribution=excluded.redistribution,payload=excluded.payload`,
        args: [
          id,
          reviewToken,
          asset.licence.id,
          asset.licence.expression,
          asset.licence.commercial,
          asset.licence.redistribution,
          JSON.stringify(asset.licence),
        ],
      });
      const searchText = [
        asset.name,
        asset.description,
        asset.providerId.replace(/-/g, ' '),
        asset.kind,
        asset.category ? `category:${asset.category}:` : '',
        ...asset.tags,
        ...asset.variants.flatMap((v) => [v.framework, v.format, v.css ?? '']),
      ]
        .join(' ')
        .toLowerCase();
      statements.push({
        sql: `INSERT INTO uixo_v2_assets(id,provider_id,slug,name,kind,price,source_url,licence_id,search_text,payload,fingerprint,updated_at) SELECT $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14 WHERE ${guard} ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,price=excluded.price,source_url=excluded.source_url,licence_id=excluded.licence_id,search_text=excluded.search_text,payload=excluded.payload,fingerprint=excluded.fingerprint,revision=uixo_v2_assets.revision+1,updated_at=excluded.updated_at`,
        args: [
          id,
          reviewToken,
          asset.id,
          asset.providerId,
          asset.slug,
          asset.name,
          asset.kind,
          asset.price,
          asset.sourceUrl,
          asset.licence.id,
          searchText,
          JSON.stringify(asset),
          fingerprint(asset),
          now,
        ],
      });
      for (const table of ['variants', 'evidence', 'previews'])
        statements.push({
          sql: `DELETE FROM uixo_v2_${table} WHERE asset_id=$3 AND ${guard}`,
          args: [id, reviewToken, asset.id],
        });
      asset.variants.forEach((v) =>
        statements.push({
          sql: `INSERT INTO uixo_v2_variants(id,asset_id,framework,format,acquisition,payload) SELECT $3,$4,$5,$6,$7,$8 WHERE ${guard}`,
          args: [
            id,
            reviewToken,
            v.id,
            asset.id,
            v.framework,
            v.format,
            v.acquisition.kind,
            JSON.stringify(v),
          ],
        }),
      );
      asset.evidence.forEach((e, i) =>
        statements.push({
          sql: `INSERT INTO uixo_v2_evidence(id,asset_id,payload) SELECT $3,$4,$5 WHERE ${guard}`,
          args: [id, reviewToken, `${asset.id}/${i}`, asset.id, JSON.stringify(e)],
        }),
      );
      if (asset.preview)
        statements.push({
          sql: `INSERT INTO uixo_v2_previews(asset_id,payload) SELECT $3,$4 WHERE ${guard}`,
          args: [id, reviewToken, asset.id, JSON.stringify(asset.preview)],
        });
    }
    statements.push({
      sql: `INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $3,$4,$5,$6,$7,$8 WHERE ${guard}`,
      args: [
        id,
        reviewToken,
        randomUUID(),
        actor,
        decision,
        asset.id,
        JSON.stringify({ revision: id, reason }),
        now,
      ],
    });
    const results = await this.db.batch(statements);
    if (!results[0].length)
      throw new RegistryError(
        'CONFLICT',
        'The published asset or review state changed. Re-index before approving this revision.',
        409,
      );
    return { id, decision, assetId: asset.id };
  }
  async inspect(id: string): Promise<Asset & { revision: number }> {
    const rows = await this.db.query(
      'SELECT a.payload,a.revision,a.editorial_pick FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE a.id=$1 AND p.approved=1',
      [identifier(id)],
    );
    if (!rows.length) throw new RegistryError('NOT_FOUND', 'Published asset not found.', 404);
    return {
      ...(JSON.parse(String(rows[0].payload)) as Asset),
      revision: Number(rows[0].revision),
      editorialPick: rows[0].editorial_pick === 1,
    };
  }
  async search(input: unknown) {
    const search = parseSearch(input);
    const { where, args } = this.searchWhere(search);
    const count = await this.db.query(
      `SELECT COUNT(*) AS count FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id JOIN uixo_v2_licences l ON l.id=a.licence_id WHERE ${where}`,
      args,
    );
    const terms = search.terms;
    const score =
      terms
        .map((term) => {
          args.push(`%${term}%`);
          return `CASE WHEN LOWER(a.name) LIKE $${args.length} THEN 10 ELSE 1 END`;
        })
        .join(' + ') || '0';
    args.push(search.limit, search.offset);
    const rows = await this.db.query(
      `SELECT a.payload,a.revision,(${score}) AS score FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id JOIN uixo_v2_licences l ON l.id=a.licence_id WHERE ${where} ORDER BY score DESC,CASE WHEN a.kind='component' THEN 0 ELSE 1 END,a.name ASC,a.id ASC LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args,
    );
    const items = rows.map((row) => {
      const a = JSON.parse(String(row.payload)) as Asset;
      return {
        ...a,
        licence: { ...a.licence, text: '' },
        evidence: a.evidence.slice(0, 2),
        revision: Number(row.revision),
        ranking: { method: 'weighted-keyword', score: Number(row.score), matchedTerms: terms },
      };
    });
    const total = Number(count[0].count);
    return {
      items,
      total,
      limit: search.limit,
      offset: search.offset,
      nextOffset: search.offset + items.length < total ? search.offset + items.length : null,
      filters: {
        framework: search.framework,
        format: search.format,
        price: search.price,
        commercial: search.commercial,
      },
      searchMode: 'weighted-keyword',
    };
  }
  private searchWhere(search: Search) {
    const clauses = ['p.approved=1'];
    // Retain old icon detail/saved links without flooding catalogue discovery.
    if (!search.saved.length) clauses.push("a.kind<>'icon'");
    const args: (string | number | null)[] = [];
    const bind = (value: string | number) => {
      args.push(value);
      return `$${args.length}`;
    };
    if (search.provider) clauses.push(`a.provider_id=${bind(search.provider)}`);
    if (search.kind) clauses.push(`a.kind=${bind(search.kind)}`);
    if (search.category) {
      clauses.push("a.kind='component'");
      clauses.push(`a.search_text LIKE ${bind(`%category:${search.category}:%`)}`);
    }
    if (search.price) clauses.push(`a.price=${bind(search.price)}`);
    if (search.commercial) clauses.push("l.commercial='allowed'");
    if (search.framework || search.format) {
      const variant = ['v.asset_id=a.id'];
      if (search.framework) variant.push(`v.framework=${bind(search.framework)}`);
      if (search.format) variant.push(`v.format=${bind(search.format)}`);
      clauses.push(`EXISTS(SELECT 1 FROM uixo_v2_variants v WHERE ${variant.join(' AND ')})`);
    }
    if (search.saved.length) clauses.push(`a.id IN (${search.saved.map(bind).join(',')})`);
    search.terms.forEach((term) => clauses.push(`a.search_text LIKE ${bind(`%${term}%`)}`));
    return { where: clauses.join(' AND '), args };
  }
  async scout(input: unknown) {
    const items = parseScout(input),
      now = new Date().toISOString();
    const result = await this.db.batch(
      items.map((item) => ({
        sql: 'INSERT INTO uixo_v2_scout(id,canonical_url,payload,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(canonical_url) DO NOTHING RETURNING id',
        args: [randomUUID(), item.url, JSON.stringify(item), now],
      })),
    );
    return {
      received: items.length,
      inserted: result.filter((r) => r.length).length,
      duplicates: result.filter((r) => !r.length).length,
      published: 0,
    };
  }
  async scoutQueue() {
    return (
      await this.db.query(
        'SELECT id,payload,status,created_at FROM uixo_v2_scout ORDER BY created_at DESC LIMIT 100',
      )
    ).map((r) => ({
      id: r.id,
      ...JSON.parse(String(r.payload)),
      status: r.status,
      createdAt: r.created_at,
    }));
  }
  async stats() {
    const result: Record<string, number> = {};
    for (const [key, query] of Object.entries({
      assets:
        "SELECT COUNT(*) AS count FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE p.approved=1 AND a.kind<>'icon'",
      providers: 'SELECT COUNT(*) AS count FROM uixo_v2_providers WHERE approved=1',
      pending: "SELECT COUNT(*) AS count FROM uixo_v2_revisions WHERE status='pending'",
      discoveries: 'SELECT COUNT(*) AS count FROM uixo_v2_scout',
    }))
      result[key] = Number((await this.db.query(query))[0].count);
    return result;
  }
}
