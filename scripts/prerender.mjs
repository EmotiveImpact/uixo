/**
 * Emits a static HTML page per resource and per category after `vite build`.
 *
 * Shareable URLs alone do not make a client-rendered app indexable: a crawler or a
 * link unfurler that does not run JavaScript sees an empty <div id="root">. Each page
 * here carries its own title, description, canonical and Open Graph tags, plus a
 * <noscript> body with real crawlable links, while still booting the same bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE = process.env.SITE_URL ?? 'https://uixo.io';

const resources = JSON.parse(readFileSync(join(root, 'src/content/resources.json'), 'utf8'));
const categories = JSON.parse(readFileSync(join(root, 'src/content/categories.json'), 'utf8'));
const collections = JSON.parse(readFileSync(join(root, 'src/content/collections.json'), 'utf8'));
const template = readFileSync(join(dist, 'index.html'), 'utf8');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const escape = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Swap the head tags the template ships with for this page's own. */
function render({ title, description, path, image, body }) {
  const url = `${SITE}${path}`;
  const ogImage = image ? `${SITE}${image}` : `${SITE}/og.png`;

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escape(description)}" />`,
    )
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace(
      /<meta property="og:title"[\s\S]*?\/>/,
      `<meta property="og:title" content="${escape(title)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${escape(description)}" />`,
    )
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}" />`)
    .replace(
      /<meta name="twitter:title"[\s\S]*?\/>/,
      `<meta name="twitter:title" content="${escape(title)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/,
      `<meta name="twitter:description" content="${escape(description)}" />`,
    )
    .replace(
      /<meta name="twitter:image"[^>]*>/,
      `<meta name="twitter:image" content="${ogImage}" />`,
    )
    .replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${body}</noscript>`);
}

/**
 * Written twice on purpose: `<path>/index.html` serves `/r/lucide/`, `<path>.html` serves
 * `/r/lucide`. Static hosts disagree about which one they resolve, so emit both rather than
 * depend on a particular host's clean-URL rules.
 */
function write(path, html) {
  const relative = path.replace(/^\//, '');
  const directory = join(dist, relative, 'index.html');
  mkdirSync(dirname(directory), { recursive: true });
  writeFileSync(directory, html);

  const flat = join(dist, `${relative}.html`);
  mkdirSync(dirname(flat), { recursive: true });
  writeFileSync(flat, html);
}

const pages = [];

for (const resource of resources) {
  const path = `/r/${resource.id}`;
  const title = `${resource.name} — ${resource.category} on UIXO`;
  const body = `
      <h1>${escape(resource.name)}</h1>
      <p>${escape(resource.description)}</p>
      <p>By ${escape(resource.creator)} · ${escape(resource.pricing)} · ${escape(resource.formats.join(', '))}</p>
      <p><a href="${escape(resource.url)}" rel="noopener">Visit ${escape(resource.name)}</a></p>
      <p><a href="/category/${slugify(resource.category)}">More ${escape(resource.category)}</a></p>`;

  write(
    path,
    render({
      title,
      description: resource.description,
      path,
      image: `/assets/${resource.id}.png`,
      body,
    }),
  );
  pages.push(path);
}

for (const category of categories) {
  const listed = resources.filter(
    (resource) => resource.category === category.name || resource.tags.includes(category.name),
  );
  if (!listed.length) continue;

  const path = `/category/${slugify(category.name)}`;
  const names = listed.map((resource) => resource.name).join(', ');
  const description = `Hand-picked ${category.name.toLowerCase()} resources on UIXO: ${names}.`;
  const body = `
      <h1>${escape(category.name)}</h1>
      <ul>${listed
        .map(
          (resource) =>
            `<li><a href="/r/${resource.id}">${escape(resource.name)}</a> — ${escape(resource.description)}</li>`,
        )
        .join('')}</ul>`;

  write(path, render({ title: `${category.name} — UIXO`, description, path, body }));
  pages.push(path);
}

for (const collection of collections) {
  const path = `/collections/${collection.slug}`;
  const listed = collection.resourceIds
    .map((id) => resources.find((resource) => resource.id === id))
    .filter(Boolean);

  const body = `
      <h1>${escape(collection.name)}</h1>
      <p>${escape(collection.description)}</p>
      <ul>${listed
        .map(
          (resource) =>
            `<li><a href="/r/${resource.id}">${escape(resource.name)}</a> — ${escape(resource.description)}</li>`,
        )
        .join('')}</ul>`;

  write(
    path,
    render({
      title: `${collection.name} — UIXO`,
      description: collection.tagline,
      path,
      image: listed[0] ? `/assets/${listed[0].id}.png` : undefined,
      body,
    }),
  );
  pages.push(path);
}

{
  const path = '/collections';
  const body = `
      <h1>Collections</h1>
      <ul>${collections
        .map(
          (collection) =>
            `<li><a href="/collections/${collection.slug}">${escape(collection.name)}</a> — ${escape(collection.tagline)}</li>`,
        )
        .join('')}</ul>`;
  write(
    path,
    render({
      title: 'Collections — UIXO',
      description: 'Curated sets of UI resources, each with a point of view.',
      path,
      body,
    }),
  );
  pages.push(path);
}

// The directory itself now lives at /browse and needs its own crawlable page.
{
  const path = '/browse';
  const body = `
      <h1>All websites</h1>
      <ul>${resources
        .map(
          (resource) =>
            `<li><a href="/r/${resource.id}">${escape(resource.name)}</a> — ${escape(resource.description)}</li>`,
        )
        .join('')}</ul>`;
  write(
    path,
    render({
      title: 'Browse all websites — UIXO',
      description: `Every listing in the UIXO directory: ${resources.map((r) => r.name).join(', ')}.`,
      path,
      body,
    }),
  );
  pages.push(path);
}

// A feed of what has been added, newest first.
const feedItems = [...resources]
  .sort((a, b) => b.addedOrder - a.addedOrder)
  .map(
    (resource) => `  <item>
    <title>${escape(resource.name)}</title>
    <link>${SITE}/r/${resource.id}</link>
    <guid isPermaLink="true">${SITE}/r/${resource.id}</guid>
    <description>${escape(resource.description)}</description>
  </item>`,
  )
  .join('\n');
writeFileSync(
  join(dist, 'feed.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>UIXO — new additions</title>
  <link>${SITE}/</link>
  <description>Hand-picked UI resources, newest first.</description>
${feedItems}
</channel>
</rss>
`,
);

// "/" is the landing page: give it the pick in its description, and real links for crawlers.
{
  const pick = JSON.parse(readFileSync(join(root, 'src/content/pick.json'), 'utf8'));
  const picked = resources.find((resource) => resource.id === pick.resourceId);
  const body = `
      <h1>Good tools. Great interfaces.</h1>
      <p>A small collection of the resources we actually reach for — components, icons, backgrounds and type. Every one chosen by hand, and checked by hand.</p>
      ${picked ? `<p><strong>Editor's pick:</strong> <a href="/r/${picked.id}">${escape(picked.name)}</a> — ${escape(pick.note)}</p>` : ''}
      <p><a href="/browse">Browse the directory</a> · <a href="/collections">Collections</a></p>`;

  writeFileSync(
    join(dist, 'index.html'),
    render({
      title: 'UIXO — Good tools. Great interfaces.',
      description:
        'A small, hand-curated directory of UI resources for people who design and build — components, icons, backgrounds, templates and type.',
      path: '/',
      body,
    }),
  );
}

const urls = ['/', ...pages].map((path) => `  <url><loc>${SITE}${path}</loc></url>`).join('\n');
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
writeFileSync(
  join(dist, 'robots.txt'),
  // /dashboard and /list/* are private and never prerendered; keep crawlers out of them.
  `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /list/\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(`prerendered ${pages.length} pages + sitemap.xml + robots.txt`);
