import { readFile } from 'node:fs/promises';
import { deliverIssue } from '../services/grok/intake.ts';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!, 'utf8'));
const repository = process.env.GITHUB_REPOSITORY!;
const result = await deliverIssue(event, {
  origin: process.env.UIXO_API_ORIGIN || '',
  token: process.env.UIXO_SCOUT_TOKEN || '',
  repository,
  authors: (process.env.UIXO_SCOUT_GITHUB_LOGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
console.log(JSON.stringify(result));
// The fixed GitHub API is the only receipt destination. No source URL receives credentials.
const headers = {
  authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
  accept: 'application/vnd.github+json',
  'content-type': 'application/json',
};
const endpoint = `https://api.github.com/repos/${repository}/issues/${event.issue.number}/comments`;
const response = await fetch(endpoint + '?per_page=100', {
  headers,
  redirect: 'error',
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(
    'Could not read GitHub intake receipts. Rerun safely after checking workflow permissions.',
  );
const comments = (await response.json()) as { id: number; user: { login: string }; body: string }[];
const marker = '<!-- uixo-candidate-receipt -->';
const previous = comments.find(
  (c) => c.user.login === 'github-actions[bot]' && c.body.startsWith(marker),
);
const body = `${marker}\nUIXO candidate: \`${result.candidateId}\`. Staged for investigation, **not published**.\n\nThis receipt identifies the canonical candidate; changed issue text remains discovery evidence, not editorial approval.`;
if (!previous || previous.body !== body) {
  const target = previous
    ? `https://api.github.com/repos/${repository}/issues/comments/${previous.id}`
    : endpoint;
  const saved = await fetch(target, {
    method: previous ? 'PATCH' : 'POST',
    headers,
    body: JSON.stringify({ body }),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!saved.ok)
    throw new Error('Candidate was staged but its GitHub receipt failed. Rerunning is idempotent.');
}
