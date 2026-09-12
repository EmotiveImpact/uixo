import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const suites = [
  [
    'core and HTTP',
    [
      'tests/registry/core.node.ts',
      'tests/registry/http.node.ts',
      'services/eve/lib/client.node.ts',
    ],
  ],
  ['official MCP client', ['registry/tests/mcp.node.ts']],
];
const results = [];
for (const [name, files] of suites) {
  const run = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files], {
    encoding: 'utf8',
    timeout: 120000,
  });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.status !== 0) {
    console.error(`Registry verification failed: ${name}`);
    process.exit(run.status || 1);
  }
  results.push({
    name,
    passed: Number(/# pass (\d+)/.exec(run.stdout)?.[1] || 0),
    status: 'passed',
  });
}
mkdirSync('public/registry', { recursive: true });
writeFileSync(
  'public/registry/verification.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      node: process.version,
      suites: results,
      limits: [
        'No live model call is performed.',
        'No production database is used.',
        'Provider fixtures do not verify current remote availability.',
      ],
    },
    null,
    2,
  ),
);
