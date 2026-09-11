# UIXO scout candidates (review inbox seed)

Staged by **X UI Scout**. These are **not** live site listings yet.

- `uixo-candidates.json` — ingest this in the logged-in review queue
- `uixo-candidates.md` — human-readable grouped table

After human approve/reject, approved rows go into `src/data.ts` with matching `public/assets/{id}.png`. Do not auto-merge unreviewed candidates into live data.
