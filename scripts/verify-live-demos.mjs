import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(fs.readFileSync('live-demos/manifest.json'));
const captures = JSON.parse(
  fs.readFileSync('public/assets/component-previews/manifest.json'),
).captures;
const sources = JSON.parse(fs.readFileSync('live-demos/source-lock.json'));
for (const id of Object.keys(captures)) {
  const entry = manifest[id];
  if (!entry || !fs.existsSync(path.join('live-demos', entry.file)))
    throw new Error(`Missing live demo for ${id}`);
}
for (const source of sources) {
  const bytes = fs.readFileSync(path.join('live-demos/vendor', source.path));
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256)
    throw new Error(`Original source changed: ${source.path}`);
}
console.log(
  `Verified ${Object.keys(manifest).length} live demo entries and ${sources.length} pinned original source files.`,
);
