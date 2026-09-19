import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Test the built artifact at Vercel's actual document URL, not just Vite's
// /live-demos/index.html. A relative HTML entry silently breaks after cleanUrls.
const root = path.resolve('public');
const html = fs.readFileSync(path.join(root, 'live-demos/index.html'), 'utf8');
const entries = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
assert(
  entries.some((entry) => entry.endsWith('.js')),
  'Missing preview JavaScript',
);
assert(
  entries.some((entry) => entry.endsWith('.css')),
  'Missing preview stylesheet',
);
for (const documentPath of ['/live-demos', '/live-demos/', '/live-demos/index.html']) {
  for (const entry of entries) {
    const url = new URL(entry, `https://uixo.example${documentPath}?id=shadcn/accordion`);
    assert.equal(url.origin, 'https://uixo.example');
    assert(url.pathname.startsWith('/live-demos/assets/'), `Wrong preview URL: ${url}`);
    assert(fs.existsSync(path.join(root, url.pathname)), `Missing preview entry: ${url}`);
  }
}
console.log('Verified live preview JS/CSS entries survive Vercel cleanUrls redirects.');
