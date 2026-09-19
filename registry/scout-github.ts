import { createHash, randomUUID } from 'node:crypto';
import {
  RegistryError,
  canonicalUrl,
  httpsUrl,
  integer,
  parseScout,
  record,
  text,
} from './domain.ts';
import type { Registry } from './service.ts';
import { requireWritable } from './collections.ts';

export function parseGithubIssue(input: unknown) {
  const raw = record(input),
    repository = text(raw.repository, 150);
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))
    throw new RegistryError('INVALID_INPUT', 'Invalid GitHub repository.');
  const number = integer(raw.number, -1, 1, 2147483647);
  if (number < 1) throw new RegistryError('INVALID_INPUT', 'Issue number is required.');
  const body = text(raw.body, 60000),
    title = text(raw.title, 300),
    author = text(raw.author, 100);
  const issueUrl = `https://github.com/${repository}/issues/${number}`;
  if (httpsUrl(raw.url) !== issueUrl)
    throw new RegistryError('INVALID_INPUT', 'Issue URL must match the repository and number.');
  const blocks = [...body.matchAll(/^```uixo-candidate\s*\r?\n([\s\S]*?)^```\s*$/gm)];
  if (blocks.length !== 1)
    throw new RegistryError(
      'INVALID_INPUT',
      'Include exactly one fenced uixo-candidate JSON block.',
    );
  let candidate: Record<string, unknown>;
  try {
    candidate = record(JSON.parse(blocks[0][1]));
  } catch {
    throw new RegistryError('INVALID_INPUT', 'The uixo-candidate block must be a JSON object.');
  }
  const keys = new Set([
    'schemaVersion',
    'name',
    'url',
    'sourcePost',
    'creator',
    'reason',
    'suggestedCategory',
    'discoveredAt',
  ]);
  if (Object.keys(candidate).some((key) => !keys.has(key)) || candidate.schemaVersion !== 1)
    throw new RegistryError(
      'INVALID_INPUT',
      'Unsupported candidate schema or fields. Scouts cannot set approval or publication state.',
    );
  const name = text(candidate.name, 150),
    url = canonicalUrl(candidate.url),
    reason = text(candidate.reason, 2000);
  if (reason.length < 10)
    throw new RegistryError('INVALID_INPUT', 'Give a discovery reason of at least ten characters.');
  const item = parseScout({
    items: [
      {
        name,
        url,
        note: reason,
        postUrl: candidate.sourcePost,
        creator: candidate.creator,
        collectedAt: candidate.discoveredAt,
        source: 'github:' + repository,
      },
    ],
  })[0];
  const suggestedCategory = text(candidate.suggestedCategory, 100, true);
  return {
    repository,
    number,
    title,
    author,
    issueUrl,
    item: { ...item, suggestedCategory },
    bodyHash: createHash('sha256')
      .update(JSON.stringify({ title, author, item, suggestedCategory }))
      .digest('hex'),
  };
}
export async function ingestGithubIssue(registry: Registry, input: unknown, actor: string) {
  requireWritable(registry);
  const issue = parseGithubIssue(input);
  const allowed = process.env.UIXO_SCOUT_GITHUB_REPOSITORY || 'EmotiveImpact/uixo';
  if (issue.repository !== allowed)
    throw new RegistryError(
      'REPOSITORY_BLOCKED',
      'This registry only accepts intake from its configured repository.',
      403,
    );
  const now = new Date().toISOString(),
    candidateId = randomUUID();
  const deliveryId = createHash('sha256')
    .update(`${issue.repository}/${issue.number}/${issue.bodyHash}`)
    .digest('hex');
  const delivery = JSON.stringify({
    issueUrl: issue.issueUrl,
    title: issue.title,
    author: issue.author,
    candidate: issue.item,
  });
  const results = await registry.db.batch([
    {
      sql: 'INSERT INTO uixo_v2_scout(id,canonical_url,payload,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(canonical_url) DO NOTHING RETURNING id',
      args: [candidateId, issue.item.url, JSON.stringify(issue.item), now],
    },
    {
      sql: 'INSERT INTO uixo_v2_github_issues(repository,issue_number,scout_id) SELECT $1,$2,id FROM uixo_v2_scout WHERE canonical_url=$3 ON CONFLICT(repository,issue_number) DO NOTHING',
      args: [issue.repository, issue.number, issue.item.url],
    },
    {
      sql: 'INSERT INTO uixo_v2_scout_deliveries(id,repository,issue_number,body_hash,scout_id,payload,received_at) SELECT $1,$2,$3,$4,g.scout_id,$5,$6 FROM uixo_v2_github_issues g JOIN uixo_v2_scout s ON s.id=g.scout_id WHERE g.repository=$2 AND g.issue_number=$3 AND s.canonical_url=$7 ON CONFLICT DO NOTHING RETURNING scout_id',
      args: [
        deliveryId,
        issue.repository,
        issue.number,
        issue.bodyHash,
        delivery,
        now,
        issue.item.url,
      ],
    },
    {
      // A concurrently retargeted issue cannot leave behind a spurious new candidate.
      sql: 'DELETE FROM uixo_v2_scout WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM uixo_v2_github_issues WHERE scout_id=$1)',
      args: [candidateId],
    },
    {
      sql: "INSERT INTO uixo_v2_audit(id,actor,action,target,detail,created_at) SELECT $1,$2,'github-intake',scout_id,$3,$4 FROM uixo_v2_scout_deliveries WHERE id=$1 ON CONFLICT(id) DO NOTHING",
      args: [
        deliveryId,
        actor,
        JSON.stringify({ repository: issue.repository, issueNumber: issue.number, deliveryId }),
        now,
      ],
    },
  ]);
  const mapping = await registry.db.query(
    'SELECT s.id,s.canonical_url FROM uixo_v2_github_issues g JOIN uixo_v2_scout s ON s.id=g.scout_id WHERE g.repository=$1 AND g.issue_number=$2',
    [issue.repository, issue.number],
  );
  if (!mapping.length || mapping[0].canonical_url !== issue.item.url)
    throw new RegistryError(
      'ISSUE_IDENTITY_CHANGED',
      'An imported issue cannot change its canonical destination. Open a new candidate issue.',
      409,
    );
  return {
    candidateId: String(mapping[0].id),
    deliveryId,
    created: results[0].length > 0,
    duplicate: results[2].length === 0,
    published: 0,
  };
}
