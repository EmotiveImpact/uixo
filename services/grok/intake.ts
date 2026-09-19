import { parseGithubIssue } from '../../registry/scout-github.ts';

type Config = {
  origin: string;
  token: string;
  repository: string;
  authors: string[];
  fetchImpl?: typeof fetch;
};
/** Event content is parsed as data, never interpolated into shell, SQL, URLs or agent instructions. */
export async function deliverIssue(event: unknown, config: Config) {
  const value = event as {
    repository?: { full_name?: string };
    issue?: {
      number: number;
      title: string;
      body: string;
      html_url: string;
      user: { login: string };
      labels: { name: string }[];
      pull_request?: unknown;
    };
  };
  const issue = value?.issue;
  if (!issue || issue.pull_request || value.repository?.full_name !== config.repository)
    throw new Error('Only an issue in the configured repository is accepted.');
  if (
    !issue.labels?.some((label) => label.name === 'uixo-candidate') ||
    !config.authors.includes(issue.user?.login)
  )
    throw new Error('The candidate label and an explicitly approved scout author are required.');
  const payload = {
    repository: config.repository,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    url: issue.html_url,
    author: issue.user.login,
  };
  parseGithubIssue(payload);
  const origin = new URL(config.origin);
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.port ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Configure one trusted HTTPS registry origin without a path or credentials.');
  if (config.token.length < 32) throw new Error('A scoped scout token is required.');
  const response = await (config.fetchImpl ?? fetch)(
    new URL('/api/registry?action=scout-github', origin),
    {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { authorization: 'Bearer ' + config.token, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok || !response.body)
    throw new Error(
      `Scout intake failed (${response.status}); inspect the registry with an operator account.`,
    );
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 50000) throw new Error('Scout response exceeded its byte budget.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    candidateId?: string;
    duplicate?: boolean;
    published?: number;
  };
  if (!/^[a-f0-9-]{36}$/.test(result.candidateId ?? '') || result.published !== 0)
    throw new Error('Unexpected scout intake receipt.');
  return { candidateId: result.candidateId!, duplicate: result.duplicate === true, published: 0 };
}
