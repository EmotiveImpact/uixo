/**
 * Pushes the content JSON into Postgres.
 *
 * The JSON files stay the source of truth for now: the site reads them at build time and
 * the prerender step needs them on disk. This mirrors them into the database so the API
 * layer has something real to serve, and so approving a candidate can eventually write
 * here instead of to a file.
 *
 * Safe to re-run — every statement upserts.
 *
 *   node --env-file=.env.local scripts/seed-db.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Run: vercel env pull .env.local');
  console.error('then: node --env-file=.env.local scripts/seed-db.mjs');
  process.exit(1);
}

const read = (file) => JSON.parse(readFileSync(join(root, 'src/content', file), 'utf8'));
const resources = read('resources.json');
const categories = read('categories.json');
const collections = read('collections.json');

if (dryRun) {
  console.log(
    `dry run: ${resources.length} resources, ${categories.length} categories, ` +
      `${collections.length} collections (${collections.reduce((n, c) => n + c.resourceIds.length, 0)} memberships)`,
  );
  process.exit(0);
}

const sql = neon(url);

for (const [position, category] of categories.entries()) {
  await sql`
    insert into categories (name, icon, sub, position)
    values (${category.name}, ${category.icon}, ${category.sub}, ${position})
    on conflict (name) do update
      set icon = excluded.icon, sub = excluded.sub, position = excluded.position`;
}

for (const resource of resources) {
  await sql`
    insert into resources (
      id, name, description, category, subcategory, tags, pricing, creator,
      formats, aliases, added_order, featured, url, last_checked
    ) values (
      ${resource.id}, ${resource.name}, ${resource.description}, ${resource.category},
      ${resource.subcategory}, ${resource.tags}, ${resource.pricing}, ${resource.creator},
      ${resource.formats}, ${resource.aliases}, ${resource.addedOrder}, ${resource.featured},
      ${resource.url}, ${resource.lastChecked}
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      subcategory = excluded.subcategory,
      tags = excluded.tags,
      pricing = excluded.pricing,
      creator = excluded.creator,
      formats = excluded.formats,
      aliases = excluded.aliases,
      added_order = excluded.added_order,
      featured = excluded.featured,
      url = excluded.url,
      last_checked = excluded.last_checked,
      updated_at = now()`;
}

for (const [position, collection] of collections.entries()) {
  await sql`
    insert into collections (slug, name, tagline, description, featured, position)
    values (${collection.slug}, ${collection.name}, ${collection.tagline},
            ${collection.description}, ${collection.featured}, ${position})
    on conflict (slug) do update set
      name = excluded.name, tagline = excluded.tagline,
      description = excluded.description, featured = excluded.featured,
      position = excluded.position`;

  for (const [index, resourceId] of collection.resourceIds.entries()) {
    await sql`
      insert into collection_resources (collection_slug, resource_id, position)
      values (${collection.slug}, ${resourceId}, ${index})
      on conflict (collection_slug, resource_id) do update set position = excluded.position`;
  }
}

const [counts] = await sql`
  select
    (select count(*) from resources) as resources,
    (select count(*) from categories) as categories,
    (select count(*) from collections) as collections,
    (select count(*) from collection_resources) as memberships`;

console.log(
  `seeded: ${counts.resources} resources · ${counts.categories} categories · ` +
    `${counts.collections} collections · ${counts.memberships} memberships`,
);
