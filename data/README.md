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
