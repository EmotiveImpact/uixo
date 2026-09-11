# Changelog

Newest first. Dates are Europe/London.

## 2026-09-11

### Real accounts

- Sign in and sign up with email and password, backed by **Neon Auth**. Passwords go
  straight to the auth service on its own origin and never touch UIXO's storage, database
  or API.
- The API verifies a short-lived signed token against the service's published keys. Nothing
  a caller asserts about itself is trusted.
- Curator permission is read from the database, not from the token, so promoting or
  demoting someone takes effect immediately rather than whenever their token expires.
- A shared `CURATOR_TOKEN` remains for scripts and for when the auth service is unreachable.

### The database

- **Neon Postgres** connected via the Vercel Marketplace. `DATABASE_URL` is injected into
  every environment automatically.
- `db/schema.sql` applied to the live database. Safe to re-run.
- `npm run db:seed` mirrors `src/content/*.json` into Postgres.

### Suggestions and reports actually go somewhere

- `POST /api/submissions` and `POST /api/reports` are public and write to Postgres.
  Previously both saved into the visitor's own browser, where nobody would ever see them.
- Moderation (`GET`, `PATCH`) requires a curator.
- URLs are restricted to `http(s)`, so `javascript:` and `data:` never reach a field that
  later renders as a link.
- A resubmitted URL returns a quiet `202` rather than an error.
- If the server is unreachable the suggestion is kept locally and the visitor is told which
  of the two happened.

### Curator review inbox

- `/review`, curator-only, ingests the scout's candidate JSON.
- Dedupes against live listings by normalised URL **and** id, and against itself.
- Flags problems rather than discarding rows: unknown category, a subcategory that does not
  belong to its category, unmappable pricing, missing reason.
- Per-item and bulk approve / reject / skip, filters, inline editing, audit trail.
- Editing an approved item returns it to pending — the decision was made against text that
  has since changed.
- `npm run candidates:apply` merges an approved export into `src/content/resources.json`,
  renumbers, and lists missing thumbnails. It never commits or merges.

### Thumbnails

- 146 of 155 candidates captured. The nine missing are bot-protected sites.
- `npm run thumbnails` generates WebP variants: 11 MB of PNG → 4 MB of WebP.

### Landing page

- `/` is now a landing page with no app chrome; `/browse` is the directory. A persistent
  sidebar and a display headline make opposite claims about where the visitor is.
- Editor's pick: one listing, with the reason in the editor's own voice.

### Discoverability

- 23 prerendered pages, each with its own title, description, canonical and Open Graph
  tags, plus a `<noscript>` body of real links.
- `sitemap.xml`, `robots.txt` (private routes excluded) and `feed.xml`.

### Structure

- `src/main.tsx` was one 48-line file holding the whole application. Split into components,
  hooks and lib modules; content moved out of code into `src/content/*.json`.
- The pre-Vite prototype archived under `legacy/`.

### Tooling

- ESLint, Prettier, Vitest. 117 tests.
- `npm run check:links` reports link rot, distinguishing bot walls from dead links.
- `db/schema.sql` keeps paid placement structurally separate from editorial `featured`.
