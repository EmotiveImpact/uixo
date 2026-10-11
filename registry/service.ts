import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { KIBO_REVIEWED_COMPONENTS } from '../shared/reviewed-previews.ts';
import { licenceLabel } from '../shared/licence-label.ts';
import { COMPONENT_CATEGORIES } from '../shared/component-categories.ts';
import type { Database, Statement } from './database.ts';
import {
  type Asset,
  type Provider,
  type Search,
  type TermGroup,
  RegistryError,
  fingerprint,
  identifier,
  parseScout,
  parseSearch,
  termGroups,
  validateAsset,
} from './domain.ts';
import { type Vocabulary, buildVocabulary, correctWord } from './spelling.ts';
import type { SearchCorrection, SearchMatch } from '../shared/search.ts';

let readyIds: Promise<string[]> | undefined;
/**
 * Components whose preview is ready from data alone, with no client handshake: a pinned live
 * demo (live-demos/manifest.json) or a reviewed, source-pinned Kibo preview. Captured images
 * count as ready in SQL; third-party embeds rank below them because only the browser can
 * tell whether they loaded.
 */
function previewReadyIds(): Promise<string[]> {
  return (readyIds ??= readFile(new URL('../live-demos/manifest.json', import.meta.url), 'utf8')
    .then((text) => Object.keys(JSON.parse(text) as Record<string, unknown>))
    .catch(() => [] as string[])
    .then((live) => [
      ...live,
      ...Object.keys(KIBO_REVIEWED_COMPONENTS).map((slug) => `kibo-ui/${slug}`),
    ]));
}

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
  /**
   * Catalogue search. Hard filters (provider, kind, category, framework, format, price,
   * commercial use) are never weakened. Terms match with synonyms and singulars; when nothing
   * matches every term, a spelling correction and then, for three or more terms, a scored
   * any-term match are tried (L-8). See `shared/search.ts` for `correction` and `match`.
   */
  async search(input: unknown) {
    const search = parseSearch(input);
    let groups = search.groups;
    let page = await this.searchPage(search, groups, groups.length);
    let match: SearchMatch = 'all-terms';
    let correction: SearchCorrection | null = null;
    if (!page.total && groups.length) {
      const corrected = search.exact ? null : await this.correctSpelling(search);
      if (corrected) {
        groups = corrected.groups;
        page = await this.searchPage(search, groups, groups.length);
      }
      if (!page.total && groups.length >= 3)
        for (const least of [Math.ceil(groups.length / 2), 1]) {
          page = await this.searchPage(search, groups, least);
          if (page.total) {
            match = 'any-term';
            break;
          }
        }
      if (corrected && page.total)
        correction = { query: corrected.query, original: search.q, changes: corrected.changes };
    }
    const { items, total } = page;
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
      /** Set when the results are for a corrected spelling; see `shared/search.ts`. */
      correction,
      /** "any-term" when nothing matched every term and results match some of them. */
      match,
    };
  }
  /** One page of results where at least `least` of the term groups match. */
  private async searchPage(search: Search, groups: TermGroup[], least: number) {
    const args: (string | number | null)[] = [];
    const bind = (value: string | number) => {
      args.push(value);
      return `$${args.length}`;
    };
    const matches = (column: string, group: TermGroup) =>
      `(${group.any.map((words) => `(${words.map((word) => `${column} LIKE ${bind(`%${word}%`)}`).join(' AND ')})`).join(' OR ')})`;
    const where = () => {
      const clauses = this.searchFilters(search, bind);
      if (groups.length && least >= groups.length)
        groups.forEach((group) => clauses.push(matches('a.search_text', group)));
      else if (groups.length)
        clauses.push(
          `(${groups.map((group) => `CASE WHEN ${matches('a.search_text', group)} THEN 1 ELSE 0 END`).join(' + ')}) >= ${bind(least)}`,
        );
      return clauses.join(' AND ');
    };
    const from =
      'FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id JOIN uixo_v2_licences l ON l.id=a.licence_id';
    const count = await this.db.query(`SELECT COUNT(*) AS count ${from} WHERE ${where()}`, args);
    const total = Number(count[0].count);
    if (!total) return { items: [], total };
    args.length = 0;
    const filter = where();
    // A name match is worth 10, a match anywhere else 1, and a missed term 0.
    const score =
      groups
        .map(
          (group) =>
            `CASE WHEN ${matches('LOWER(a.name)', group)} THEN 10 WHEN ${matches('a.search_text', group)} THEN 1 ELSE 0 END`,
        )
        .join(' + ') || '0';
    // Libraries whose live previews are still pending sink below ready ones.
    const pending = `CASE WHEN p.payload LIKE '%"previewsPending":true%' THEN 1 ELSE 0 END`;
    const componentsFirst = `CASE WHEN a.kind='component' THEN 0 ELSE 1 END`;
    let relevant = `score DESC,a.editorial_pick DESC,${pending},${componentsFirst},a.name ASC,a.id ASC`;
    if (!groups.length) {
      // No query: "Recommended" leads with what people can take (L-7). Editorial pick, then a
      // preview that is ready from data alone, then an install command, then commercial use
      // allowed, then the name compared case-insensitively.
      const ready = (await previewReadyIds()).map(bind);
      const preview = `CASE WHEN ${pending}=1 THEN 0${ready.length ? ` WHEN a.id IN (${ready.join(',')}) THEN 2` : ''} WHEN a.payload LIKE '%"preview":{"kind":"image"%' THEN 2 WHEN a.payload LIKE '%"preview":{"kind":"embed"%' THEN 1 ELSE 0 END`;
      const install = `CASE WHEN EXISTS(SELECT 1 FROM uixo_v2_variants iv WHERE iv.asset_id=a.id AND iv.acquisition IN ('registry','package')) THEN 1 ELSE 0 END`;
      const commercial = `CASE WHEN l.commercial='allowed' THEN 1 ELSE 0 END`;
      relevant = `a.editorial_pick DESC,${preview} DESC,${install} DESC,${commercial} DESC,${componentsFirst},LOWER(a.name) ASC,a.id ASC`;
    }
    const order = {
      relevant,
      newest: `a.updated_at DESC,${pending},score DESC,LOWER(a.name) ASC,a.id ASC`,
      name: `LOWER(a.name) ASC,a.id ASC`,
    }[search.sort];
    const rows = await this.db.query(
      `SELECT a.payload,a.revision,a.search_text,(${score}) AS score ${from} WHERE ${filter} ORDER BY ${order} LIMIT ${bind(search.limit)} OFFSET ${bind(search.offset)}`,
      args,
    );
    const items = rows.map((row) => {
      const a = JSON.parse(String(row.payload)) as Asset;
      const text = String(row.search_text);
      return {
        ...a,
        licence: { ...a.licence, text: '' },
        /** "Free" only when commercial use is allowed, else "Licence unknown" or the licence (L-1). */
        licenceLabel: licenceLabel(a),
        evidence: a.evidence.slice(0, 2),
        revision: Number(row.revision),
        ranking: {
          method: 'weighted-keyword',
          score: Number(row.score),
          matchedTerms: groups
            .filter((group) => group.any.some((words) => words.every((w) => text.includes(w))))
            .map((group) => group.term),
        },
      };
    });
    return { items, total };
  }
  private searchFilters(search: Search, bind: (value: string | number) => string) {
    const clauses = ['p.approved=1'];
    // Retain old icon detail/saved links without flooding catalogue discovery.
    if (!search.saved.length) clauses.push("a.kind<>'icon'");
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
    return clauses;
  }
  private vocabulary?: { key: string; value: Vocabulary };
  /** Names, categories and search text of the published catalogue, rebuilt when it changes. */
  private async searchVocabulary(): Promise<Vocabulary> {
    const published =
      "FROM uixo_v2_assets a JOIN uixo_v2_providers p ON p.id=a.provider_id WHERE p.approved=1 AND a.kind<>'icon'";
    const [state] = await this.db.query(
      `SELECT COUNT(*) AS count, MAX(a.updated_at) AS updated ${published}`,
    );
    const key = `${state.count}:${state.updated}`;
    if (this.vocabulary?.key !== key) {
      const rows = await this.db.query(`SELECT a.name,a.search_text ${published}`);
      this.vocabulary = {
        key,
        value: buildVocabulary(
          rows.map((row) => ({ name: String(row.name), searchText: String(row.search_text) })),
        ),
      };
    }
    return this.vocabulary.value;
  }
  /** Correct words that appear nowhere in the catalogue; null when no word changes. */
  private async correctSpelling(search: Search) {
    const vocabulary = await this.searchVocabulary();
    const changes: { from: string; to: string }[] = [];
    const words = search.groups.flatMap((group) => {
      const single = group.any.length === 1 && group.any[0].length === 1;
      const to = single ? correctWord(group.term, vocabulary) : null;
      if (to) changes.push({ from: group.term, to });
      return (to ?? group.term).split(' ');
    });
    if (!changes.length) return null;
    // Regroup so corrected words can form a synonym phrase ("pricng tabel" → "pricing table").
    const groups = termGroups(words);
    // Corrected words are plain lower-case letters, so they are safe inside a pattern.
    const query = changes.reduce(
      (text, change) => text.replace(new RegExp(`\\b${change.from}\\b`, 'g'), change.to),
      search.q,
    );
    return { groups, changes, query };
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
