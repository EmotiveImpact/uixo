import { readFile, stat } from 'node:fs/promises';
import { PROVIDERS } from '../registry/providers.ts';

const root = new URL('../', import.meta.url);
const manifestUrl = new URL('public/assets/component-previews/manifest.json', root);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const expected = new Set();

const captured = JSON.parse(await readFile(new URL('data/registry/captured.json', root), 'utf8'));
for (const [name] of captured.components) expected.add(`shadcn/${name}`);

for (const provider of PROVIDERS.filter((entry) => entry.adapter === 'github-json-registry')) {
  const snapshot = JSON.parse(
    await readFile(new URL(`data/registry/snapshots/${provider.id}.json`, root), 'utf8'),
  );
  for (const item of snapshot.items) {
    if (!['registry:ui', 'registry:component'].includes(item.type)) continue;
    if (provider.excludedComponents?.includes(item.name)) continue;
    expected.add(`${provider.id}/${item.name}`);
  }
}

const live = JSON.parse(await readFile(new URL('live-demos/manifest.json', root), 'utf8'));
for (const id of Object.keys(live)) expected.add(id);
const capturedIds = new Set(Object.keys(manifest.captures));
const missing = [...expected].filter((id) => !capturedIds.has(id) && !live[id]);
const unexpected = [...capturedIds].filter((id) => !expected.has(id));
if (missing.length || unexpected.length) {
  throw new Error(
    [
      missing.length ? `Missing official captures: ${missing.join(', ')}` : '',
      unexpected.length ? `Unexpected captures: ${unexpected.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

for (const id of expected) {
  const capture = manifest.captures[id];
  if (!capture) continue;
  const provider = PROVIDERS.find((entry) => id.startsWith(`${entry.id}/`));
  if (!provider || !new URL(capture.sourceUrl).hostname.endsWith(new URL(provider.url).hostname)) {
    throw new Error(`${id} is not attributed to its official provider URL.`);
  }
  if (!Number.isInteger(capture.width) || !Number.isInteger(capture.height)) {
    throw new Error(`${id} is missing capture dimensions.`);
  }
  const file = new URL(`public${capture.path}`, root);
  const bytes = await readFile(file);
  if (
    bytes.length < 400 ||
    bytes.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    bytes.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    throw new Error(`${id} is not a valid captured WebP preview.`);
  }
  const info = await stat(file);
  if (info.size !== capture.bytes) throw new Error(`${id} no longer matches its capture manifest.`);
}

console.log(
  `Verified ${capturedIds.size} official provider demo captures plus ${expected.size - capturedIds.size} live-only demos; schematic previews are forbidden.`,
);
