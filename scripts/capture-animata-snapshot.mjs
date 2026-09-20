import { mkdir, writeFile } from 'node:fs/promises';

const repo = 'codse/animata';
const base = `https://api.github.com/repos/${repo}`;
const response = await fetch(`${base}/git/refs/heads/main`);
if (!response.ok) throw new Error(`Unable to resolve Animata main: ${response.status}`);
const ref = (await response.json()).object?.sha;
if (!/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('Animata did not return a commit SHA.');

const [treeResponse, storyResponse, licenceResponse] = await Promise.all([
  fetch(`${base}/git/trees/${ref}?recursive=1`),
  fetch('https://animata.design/preview/index.json'),
  fetch(`https://raw.githubusercontent.com/${repo}/${ref}/LICENSE.md`),
]);
if (!treeResponse.ok || !storyResponse.ok || !licenceResponse.ok)
  throw new Error(
    `Animata capture failed: tree=${treeResponse.status}, Storybook=${storyResponse.status}, licence=${licenceResponse.status}`,
  );

const tree = await treeResponse.json();
const index = await storyResponse.json();
const stories = Object.values(index.entries ?? {}).filter(
  (entry) => entry.type === 'story' && typeof entry.componentPath === 'string',
);
const storyForPath = new Map(
  stories.map((entry) => [entry.componentPath.replace(/^\.\//, ''), entry]),
);
// These files are in the upstream repository but have no entry in its public Storybook index.
// Keep them out until the provider publishes a runnable, reviewable demo.
const WITHOUT_OFFICIAL_DEMO = new Set([
  'animata/card/card-stack-profile.tsx',
  'animata/skeleton/category-glyphs.tsx',
  'animata/text/text-animator.tsx',
]);
const componentPaths = tree.tree
  .map((entry) => entry.path)
  .filter((path) => /^animata\/[^/]+\/[^/]+\.tsx$/.test(path) && !path.endsWith('.stories.tsx'))
  .filter((path) => !WITHOUT_OFFICIAL_DEMO.has(path))
  .sort();

const title = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const missing = [];
const items = componentPaths.map((path) => {
  const [, category, filename] = path.match(/^animata\/([^/]+)\/([^/]+)\.tsx$/);
  const slug = filename.replace(/\.tsx$/, '');
  const story = storyForPath.get(path);
  if (!story?.id) missing.push(path);
  return { path, category, slug, name: title(slug), storyId: story?.id ?? '' };
});
if (missing.length)
  throw new Error(`Missing an official Storybook story for: ${missing.join(', ')}`);

const observedAt = new Date().toISOString();
await mkdir('data/registry/snapshots', { recursive: true });
await mkdir('data/registry/licences', { recursive: true });
await writeFile(
  'data/registry/snapshots/animata.json',
  `${JSON.stringify({ repo, ref, observedAt, items }, null, 2)}\n`,
);
await writeFile('data/registry/licences/animata.txt', await licenceResponse.text());
console.log(`Captured ${items.length} Animata components at ${ref}.`);
