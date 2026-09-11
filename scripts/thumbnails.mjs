/**
 * Generates WebP variants of every thumbnail at the widths the grid actually renders.
 *
 * The PNGs stay as the fallback; the app prefers WebP through a <picture> element. At a
 * handful of listings this is a rounding error, but the plan is 50-100, at which point
 * unoptimised full-size PNGs are the heaviest thing on the page.
 *
 * Requires cwebp (`brew install webp`).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public/assets');
const target = join(root, 'public/assets/w');
const WIDTHS = [400, 800];

mkdirSync(target, { recursive: true });

const pngs = readdirSync(source).filter((file) => file.endsWith('.png'));
let before = 0;
let after = 0;

for (const file of pngs) {
  const name = basename(file, '.png');
  before += statSync(join(source, file)).size;

  for (const width of WIDTHS) {
    const out = join(target, `${name}-${width}.webp`);
    execFileSync('cwebp', [
      '-quiet',
      '-q',
      '78',
      '-resize',
      String(width),
      '0',
      join(source, file),
      '-o',
      out,
    ]);
    after += statSync(out).size;
  }
}

// A <picture> does not fall back to its <img> when the chosen <source> 404s — it errors.
// So the app must know which ids actually have variants rather than assuming all do.
const ids = pngs.map((file) => basename(file, '.png')).sort();
writeFileSync(join(root, 'src/content/thumbnails.json'), `${JSON.stringify(ids, null, 2)}\n`);

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
console.log(
  `thumbnails: ${pngs.length} PNG (${kb(before)}) -> ${pngs.length * WIDTHS.length} WebP (${kb(after)})`,
);
console.log(`manifest: src/content/thumbnails.json lists ${ids.length} ids with variants`);
