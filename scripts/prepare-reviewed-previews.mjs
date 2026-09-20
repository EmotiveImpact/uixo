import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readKiboSnapshot, readKiboLicence } from '../registry/kibo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = await readKiboSnapshot();
await readKiboLicence(snapshot);
const target = path.join(root, 'provider-demos/kibo-ui');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
let requests = 0;
async function original(source) {
  const output = path.join(target, 'vendor', source.path);
  let bytes;
  try {
    bytes = await readFile(output);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (bytes && (sha(bytes) !== source.sha256 || bytes.length !== source.bytes))
    throw new Error(`Reviewed source was modified: ${source.path}`);
  if (!bytes && process.env.UIXO_KIBO_SOURCE_DIR)
    bytes = await readFile(path.join(process.env.UIXO_KIBO_SOURCE_DIR, source.path));
  if (!bytes) {
    if (++requests > 128) throw new Error('Reviewed-source request budget exceeded.');
    const url = `https://raw.githubusercontent.com/${snapshot.repo}/${snapshot.ref}/${source.path}`;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body)
      throw new Error(`Reviewed-source retrieval failed (${response.status}): ${source.path}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > source.bytes)
        throw new Error(`Reviewed-source byte budget exceeded: ${source.path}`);
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  }
  if (bytes.length !== source.bytes || sha(bytes) !== source.sha256)
    throw new Error(`Upstream content does not match the reviewed SHA-256: ${source.path}`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, bytes);
}
// Bounded batches; no arbitrary hosts, redirects, execution, or runtime fetching.
for (let i = 0; i < snapshot.files.length; i += 4)
  await Promise.all(snapshot.files.slice(i, i + 4).map(original));
const css = await readFile(path.join(target, 'vendor/apps/docs/app/global.css'), 'utf8');
if (!css.includes('/* Custom */')) throw new Error('Kibo upstream theme boundary changed.');
const theme = css
  .split('/* Custom */')[0]
  .replace(/^@import "fumadocs-ui\/[^"\n]+";\r?\n/gm, '')
  .replace(/^@source [^\n]+\r?\n/gm, '');
await writeFile(path.join(target, 'upstream-theme.css'), theme);
await copyFile(path.join(target, 'vendor/license.md'), path.join(target, 'LICENSE.upstream.txt'));
console.log(
  `Verified ${snapshot.files.length} pinned Kibo source/evidence files for ${snapshot.items.length} real previews.`,
);
