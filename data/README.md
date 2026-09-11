# UIXO scout candidates (review inbox seed)

Staged by **X UI Scout**. These are **not** live site listings yet.

- `uixo-candidates.json` — load this in the review inbox at `/review` (curator only)
- `uixo-candidates.md` — human-readable grouped table

## How a candidate becomes a listing

1. Sign in as a curator and open `/review`, then load `uixo-candidates.json`.
2. Work the queue: rewrite the description, fix category/subcategory/pricing, approve or reject.
   The scout's `why` is a research note, not copy — it seeds the field and has to be rewritten.
3. Export the approved set. The browser can only hand you a file, so this downloads
   `uixo-approved.json`.
4. Apply it:

   ```sh
   npm run candidates:apply -- ~/Downloads/uixo-approved.json --dry-run
   npm run candidates:apply -- ~/Downloads/uixo-approved.json --branch
   ```

   That merges into `src/content/resources.json` (not `src/data.ts` — content moved out of
   code), renumbers `addedOrder` past whatever is already live, and lists any listing still
   missing `public/assets/<id>.png`.

5. Add the thumbnails, check the diff, commit and open a PR yourself. Nothing here commits,
   pushes or merges on your behalf.

## Field mapping

| Scout                     | Live                                   |
| ------------------------- | -------------------------------------- |
| `access: ["Free"]`        | `pricing: "Free"`                      |
| `access: ["Paid"]`        | `pricing: "Paid"`                      |
| `access: ["Free","Paid"]` | `pricing: "Freemium"`                  |
| `why`                     | seeds `description`, reviewer rewrites |
| `addedOrder`              | discarded and renumbered on apply      |

`aliases` defaults to empty and `featured` to false: both are editorial calls, not scout output.

## Thumbnail spec

Screenshots go to `public/assets/<id>.png`, where `<id>` is exactly the candidate's `id`
field. A listing whose file is missing renders as a letter tile, not a broken image.

| | |
|---|---|
| Format | PNG |
| Size | **1280×720** (matches the existing set) |
| Viewport | 1280×720, `deviceScaleFactor: 1` |
| Content | above the fold only — do not capture full page |

Cards crop with `object-fit: cover` anchored to the **top**, at aspect ratios between 1.2
and 1.4, so anything below roughly the first 900px of a 1280-wide capture will never be
seen. A full-page screenshot produces a card showing a thin strip of header.

If a site's subject sits mid-page rather than top-left, set `"framing": "center"` on the
listing in `src/content/resources.json` — that centres the crop on every surface.

### After the PNGs land

```sh
npm run thumbnails
```

This generates the 400px and 800px WebP variants **and** rewrites
`src/content/thumbnails.json`, which is the list of ids the app will offer WebP for.

That manifest is not optional bookkeeping: a `<picture>` whose chosen `<source>` 404s does
**not** fall back to its `<img>` — it errors. Before the manifest existed, adding a PNG
without running the generator turned that listing into a blank tile. Now the app only
offers WebP for ids in the manifest, so a PNG on its own is merely heavier, not broken.
Run the generator anyway; 155 unoptimised PNGs is a slow page.
