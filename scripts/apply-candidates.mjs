/**
 * Merges an approved-candidate export into src/content/resources.json.
 *
 * The review inbox runs in a browser, so it can only hand you a file. This is the half
 * that touches the repo. It deliberately does not commit, push or open a PR: a human
 * approving a listing and a human publishing it are two different decisions, and the
 * second one should stay a conscious act.
 *
 *   node scripts/apply-candidates.mjs uixo-approved.json [--branch] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const branch = args.includes('--branch');

if (!input) {
  console.error('usage: node scripts/apply-candidates.mjs <approved.json> [--branch] [--dry-run]');
  process.exit(1);
}

const resourcesPath = join(root, 'src/content/resources.json');
const live = JSON.parse(readFileSync(resourcesPath, 'utf8'));
const approved = JSON.parse(readFileSync(input, 'utf8'));

const norm = (url) =>
  url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase();

const liveIds = new Set(live.map((entry) => entry.id));
const liveUrls = new Set(live.map((entry) => norm(entry.url)));

const REQUIRED = ['id', 'name', 'description', 'category', 'subcategory', 'pricing', 'url'];

const rejected = [];
const incoming = [];

for (const row of approved) {
  const missing = REQUIRED.filter((field) => !row[field]);
  if (missing.length) {
    rejected.push(`${row.id ?? '(no id)'}: missing ${missing.join(', ')}`);
    continue;
  }
  if (liveIds.has(row.id) || liveUrls.has(norm(row.url))) {
    rejected.push(`${row.id}: already listed`);
    continue;
  }
  liveIds.add(row.id);
  liveUrls.add(norm(row.url));
  incoming.push(row);
}

// Renumber regardless of what the export said: only this file knows what is already live.
let order = Math.max(0, ...live.map((entry) => entry.addedOrder ?? 0));
for (const row of incoming) row.addedOrder = ++order;

const missingImages = incoming.filter(
  (row) => !existsSync(join(root, 'public/assets', `${row.id}.png`)),
);

console.log(`${incoming.length} to add, ${rejected.length} rejected`);
for (const line of rejected) console.log(`  skip  ${line}`);

if (missingImages.length) {
  console.log(`\n${missingImages.length} without a thumbnail at public/assets/<id>.png:`);
  for (const row of missingImages) console.log(`  ${row.id}.png`);
  console.log('\nThe cards will fall back to a letter tile until those exist.');
}

if (dryRun) {
  console.log('\n--dry-run: nothing written');
  process.exit(0);
}
if (!incoming.length) process.exit(0);

if (branch) {
  const name = `candidates/${new Date().toISOString().slice(0, 10)}-${incoming.length}-listings`;
  execFileSync('git', ['checkout', '-b', name], { cwd: root, stdio: 'inherit' });
  console.log(`\nbranched: ${name}`);
}

writeFileSync(resourcesPath, `${JSON.stringify([...live, ...incoming], null, 2)}\n`);
console.log(`\nwrote ${incoming.length} rows to src/content/resources.json`);
console.log('Review the diff, add any missing thumbnails, then commit and open a PR yourself.');
