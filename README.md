# UIXO

A hand-curated directory of UI resources, built with Vite, React 19, TypeScript and Tailwind CSS v4.

## Run locally

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run lint        # eslint
npm run format      # prettier --write .
npm run build       # typecheck, bundle, then prerender
npm run check:links # re-request every listing URL; non-zero exit if any are dead
npm run thumbnails  # regenerate WebP variants from public/assets/*.png (needs cwebp)
```

## How it works

**Content** lives in `src/content/*.json`, not in code, so it can be edited, generated or
validated without touching the app — and so the prerender step can read it outside the bundle.
See [docs/CONTENT.md](docs/CONTENT.md) for the shape of a listing and how to add one.

**Two surfaces, one app.** `/` is the landing page — it renders without the sidebar and topbar,
because its job is to say what UIXO is rather than to help you find things. `/browse` is the
directory itself, with the sidebar, filters and quick view. Mixing the two on one screen was the
thing that never worked: a persistent sidebar says "you are inside a tool" while a display
headline says "you have just arrived", and both cannot be true at once.

**The editor's pick** on the landing page is one listing with the reason in the editor's own
voice, from `src/content/pick.json`. The note is the whole point — if it reads like the card
description, the band is not earning its space, and the honest move is to delete it.

**Every view has a URL.** Categories, subcategories, collections and individual resources are
real paths (`/category/icons/outline`, `/r/lucide`, `/collection/favourites`); search, pricing,
format and ordering are query parameters. Back and forward work, and any view can be linked.

**Pages are prerendered.** Shareable URLs alone do not make a client-rendered app indexable — a
crawler or link unfurler that does not run JavaScript sees an empty `<div id="root">`. After
bundling, `scripts/prerender.mjs` writes a static HTML page per resource and per category, each
with its own title, description, canonical and Open Graph tags plus a `<noscript>` body of real
links, along with `sitemap.xml` and `robots.txt`.

**Collections vs lists.** _Collections_ are editorial — curated sets with a point of view,
authored in `src/content/collections.json`, prerendered and shareable. _Lists_ are a visitor's
own saved groups, kept in their browser; "Favourites" is the default one, and resources saved
under earlier versions are migrated into it on first load.

**Auth is behind an interface.** `src/lib/auth.ts` defines `AuthProvider` and ships a local mock
so the signed-in experience works before a backend exists. Swapping in a real provider is a
one-file change — no component imports a provider directly. The mock verifies nothing and must
not ship; an address containing "curator" gets the moderation views.

**The dashboard** at `/dashboard` shows a member their lists and submissions, and shows a curator
the review queue, open link reports, and listings that have not been checked in 90 days.

**Featured is editorial.** It means a listing was chosen, not that it is popular. Any
future popularity signal should be a separate ordering, not folded into this one.

## Project structure

```
index.html            Vite entry document and default meta tags
src/
  main.tsx            Mounts <App /> into #root
  App.tsx             Composition; route and collection state
  data.ts             Loads content JSON, maps category icons by name
  types.ts            Shared domain types
  styles.css          Tailwind import plus the site's own theme tokens
  components/         LandingPage, sidebar, topbar, grid, card, quick view, dialog
  components/motion/  Vendored Be UI animated sidebar (see COMPONENT-SOURCE.md)
  hooks/              useRoute, useCollections, useTheme, useSearchHotkey, useDialog
  lib/                filters, url, collections, storage (+ vendored ease, utils)
  content/            resources.json, categories.json, collections.json, pick.json
scripts/
  prerender.mjs       Static pages, sitemap, feed and robots after the bundle
  check-links.mjs     Link rot and staleness report
  thumbnails.mjs      WebP variants at the widths the grid renders
  og-template.html    Source for public/og.png
db/
  schema.sql          Postgres schema (Neon) matching the types in src/
legacy/               Archived pre-Vite prototype; not built or imported
```

Tests cover the filtering logic, collection management and URL round-tripping —
`src/lib/*.test.ts`.

## Notes

The animated sidebar uses the original Be UI component; see
[COMPONENT-SOURCE.md](COMPONENT-SOURCE.md) for provenance. Resource thumbnails are screenshots of
the linked websites and their branding belongs to the respective owners. Submissions and broken-link
reports are stored in the visitor's own browser — there is no backend yet.
