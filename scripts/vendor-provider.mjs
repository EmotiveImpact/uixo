// Copies original provider files, unchanged, from a pinned commit into live-demos/vendor and
// records each one in live-demos/source-lock.json. Nothing is rewritten: demos that need
// glue get it in live-demos/examples, never in a vendored file.
//
//   node scripts/vendor-provider.mjs <provider> <owner/repo> <commit> [--strip <prefix>] <path>...
//
// Paths are repository paths at <commit>. --strip removes a leading folder (for example
// apps/www/) so the provider's own "@/" imports resolve inside vendor/<provider>.
// Each file's "@/" and relative imports are followed and vendored too; the npm packages
// they import are listed at the end, to add to live-demos/package.json.
// The repository is cached as a blobless clone in $VENDOR_CACHE (default: the OS temp dir).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [provider, repo, commit, ...rest] = process.argv.slice(2);
if (!provider || !repo || !/^[0-9a-f]{40}$/.test(commit ?? ''))
  throw new Error(
    'Usage: vendor-provider.mjs <provider> <owner/repo> <commit> [--strip p] <path>...',
  );
let strip = '';
const files = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--strip') strip = rest[++i];
  else files.push(rest[i]);
}

const cache = path.join(
  process.env.VENDOR_CACHE ?? tmpdir(),
  'uixo-vendor',
  repo.replace('/', '__'),
);
const git = (...args) => execFileSync('git', ['-C', cache, ...args], { maxBuffer: 1 << 28 });
if (!existsSync(path.join(cache, '.git'))) {
  mkdirSync(cache, { recursive: true });
  execFileSync('git', ['init', '-q', cache]);
  git('remote', 'add', 'origin', `https://github.com/${repo}`);
  git('config', 'remote.origin.promisor', 'true');
  git('config', 'remote.origin.partialclonefilter', 'blob:none');
}
try {
  git('cat-file', '-e', `${commit}^{commit}`);
} catch {
  git('fetch', '-q', '--filter=blob:none', '--depth', '1', 'origin', commit);
}

const tree = new Set(git('ls-tree', '-r', '--name-only', commit).toString('utf8').split('\n'));
const exists = (file) => tree.has(file);
const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js'];
function resolveImport(from, specifier) {
  const base = specifier.startsWith('@/')
    ? path.posix.join(strip, specifier.slice(2))
    : path.posix.join(path.posix.dirname(from), specifier);
  return EXTENSIONS.map((ext) => base + ext).find(exists);
}
const packages = new Set();
const queue = [...files];
const seen = new Set();
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  if (!/\.(tsx?|jsx?|css)$/.test(file)) continue;
  const text = git('show', `${commit}:${file}`).toString('utf8');
  for (const [, specifier] of text.matchAll(/(?:from|import|@plugin)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const found = resolveImport(file, specifier);
      if (found) queue.push(found);
      else console.warn(`unresolved ${specifier} in ${file}`);
    } else if (
      !specifier.startsWith('node:') &&
      !/^(tailwindcss|react|react-dom)(\/|$)/.test(specifier)
    ) {
      packages.add(
        specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0],
      );
    }
  }
}
files.splice(0, files.length, ...seen);

const lockPath = 'live-demos/source-lock.json';
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const byPath = new Map(lock.map((entry) => [entry.path, entry]));
for (const file of files) {
  if (strip && !file.startsWith(strip)) throw new Error(`${file} does not start with ${strip}`);
  const local = path.posix.join(provider, file.slice(strip.length));
  if (local.includes('..')) throw new Error(`Unsafe path: ${file}`);
  const bytes = git('show', `${commit}:${file}`);
  const target = path.join('live-demos/vendor', local);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  byPath.set(local, {
    path: local,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceUrl: `https://github.com/${repo}/blob/${commit}/${file}`,
  });
  console.log(`vendored ${local}`);
}
// Existing entries keep their place; new files are appended.
writeFileSync(lockPath, `${JSON.stringify([...byPath.values()], null, 2)}\n`);
if (packages.size) console.log(`packages: ${[...packages].sort().join(' ')}`);
