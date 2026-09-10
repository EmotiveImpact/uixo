# Adding and maintaining listings

The directory is two JSON files. Nothing else needs to change to add a resource.

## A listing

`src/content/resources.json`:

```json
{
  "id": "lucide",
  "name": "Lucide",
  "description": "One sentence on what it is and why it earns a place here.",
  "category": "Icons",
  "subcategory": "Outline",
  "tags": ["SVG", "Open source"],
  "pricing": "Free",
  "creator": "Lucide",
  "formats": ["SVG", "React"],
  "aliases": ["feather icons", "icon set", "svg icons"],
  "addedOrder": 5,
  "featured": true,
  "url": "https://lucide.dev/",
  "lastChecked": "2026-09-10"
}
```

- **`id`** doubles as the thumbnail filename (`public/assets/<id>.png`) and the URL
  (`/r/<id>`). Once published, changing it breaks both.
- **`description`** is the point of the directory. Say what it is and why it is worth
  someone's time; skip marketing adjectives.
- **`pricing`** is one of `Free`, `Freemium`, `Paid` — never a combination. Freemium means a
  usable free tier with paid plans above it.
- **`tags`** widen where a listing appears: a resource is matched by a category or
  subcategory it is _tagged_ with, not just the one it is filed under. Tag generously but
  honestly — over-tagging makes categories look fuller than the collection really is.
- **`aliases`** are what people type instead of the name: other spellings, the thing it
  forked from, the job it does. Search requires every term to match, so aliases are what
  make "shad cn" and "feather" find the right listing.
- **`featured`** is editorial. It means _we reach for this_, not _this is popular_.
- **`lastChecked`** is surfaced in the quick view. Update it when you verify the link.

`src/content/categories.json` holds `{ name, icon, sub }`. `icon` is a key in
`CATEGORY_ICONS` in `src/data.ts` — add the lucide import and the map entry when
introducing a new one. Unknown keys fall back to a default rather than crashing.
Subcategories with no matching resources are hidden automatically, so it is safe to
define the full taxonomy before the content exists to fill it.

## The manual pass, per resource

1. Capture a thumbnail at roughly 1200×800 and save it as `public/assets/<id>.png`.
2. Write the description and aliases.
3. Set `addedOrder` to one more than the current maximum — it drives "Recent".
4. Run `npm run build` and check the generated `/r/<id>` page.

## Automating the tedious parts

Steps 1 and 2 are the bottleneck, and both are mechanisable: fetch the page, pull its
title, `og:description` and `og:image`, capture a screenshot, propose category, tags,
formats and pricing with the evidence for each, check `id` and `url` against the existing
file for duplicates, and write a draft entry for a human to edit and approve.

Nothing here depends on a particular tool — it needs a fetcher, a screenshot service and
a review step, whether that is a script, a scheduled job or an agent framework. Keep the
approval step human: the descriptions and the `featured` flag are the editorial judgment
that the directory is actually selling.

A scheduled job can also re-request every `url`, flag non-200 responses and stale
`lastChecked` dates, and open them for review. Visitors can already flag a listing from
the quick view; those reports currently land in their own browser and will need a backend
to reach you.

## Changing the editor's pick

`src/content/pick.json`:

```json
{
  "resourceId": "grainient",
  "note": "Most gradient packs are a hundred takes on one idea. This one groups by mood rather than hue, so you pick a feeling instead of a hex value.",
  "pickedOn": "2026-09-08"
}
```

Write the note in the first person and make it an argument, not a summary — say what this does
that the alternatives don't. Roughly 120-200 characters reads well at the size it renders. The
note also becomes part of the landing page's prerendered `<noscript>` body, so it is the first
thing a crawler reads about the site.

Whatever is picked is excluded from the Featured row automatically, so it never appears twice.

## Regenerating the social card

`public/og.png` is a screenshot of `scripts/og-template.html`:

```sh
npm run dev
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot=public/og.png http://127.0.0.1:4173/scripts/og-template.html
```
