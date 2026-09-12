import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../src/components/previews/shadcn/', import.meta.url);
const expected = {
  'alert.tsx': 'd03dcae5cdb63c381c1144ca9a0c49ba0e46466967d7deb94662034042acb034',
  'card.tsx': 'ef8305b12c3112dab42a4708b41b1ebcc042fa5ab4c20f039da8d45b09ed5059',
  'input.tsx': '0c9457181f6ddc80969bcf854e92c362903a55b6e889fbef3fd85343ecc4af5b',
  'skeleton.tsx': 'f51ce0fcd31e5c31437382e80ea0af94b4fc3d64221d27091d36824546780a43',
  'spinner.tsx': '5d040fc49cb54c0296070644053b5a8840ddbfca89a430546bf308df3fffad65',
  'LICENSE.md': '1564074e13439397221ffd522e2e504d56561994a23d371aa5e3ad43e4f5423f',
};

for (const [name, expectedHash] of Object.entries(expected)) {
  let source = await readFile(new URL(name, root), 'utf8');
  if (name.endsWith('.tsx')) {
    source = source.replace('from "../../../lib/utils"', 'from "cn"');
  }
  const actualHash = createHash('sha256').update(source).digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(
      `${name} no longer matches shadcn/ui commit 2b3e6d4f8d9161fe5c19340dc383aade392012dd. Review and repin the source before changing its preview.`,
    );
  }
}

console.log('Verified 5 source-pinned shadcn previews and the retained MIT licence.');
