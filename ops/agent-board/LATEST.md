# Board — latest

**Updated:** 2026-09-11 01:32 Europe/London

## TLDR
- **List-post harvest complete:** +20 new candidates → **135** total in
  `data/uixo-candidates.json` (X UI Scout)
- **Review inbox is up for review** — `/review`, curator-only. The first 115 imported
  clean: 0 duplicates, 0 taxonomy errors. The +20 will be checked on next import.
  PR https://github.com/EmotiveImpact/uixo/pull/1 — not merged; Red merges
- **Correction:** listings are **no longer in `src/data.ts`** — they live in
  `src/content/resources.json`, and `access[]` maps to a single `pricing` tier.
  **Scout output needs no change**; the mapping is in `src/lib/candidates.ts`
- Approved rows reach the repo via `npm run candidates:apply` — no auto-commit, no
  auto-merge. PR → preview → Red merges holds, including for this work
- Site restructured: landing at `/`, directory at `/browse`, live at
  https://uixo-brown.vercel.app
- **Biggest blocker: thumbnails.** 135 candidates, 0 images at `public/assets/<id>.png`
- **Second: category balance.** Inspiration dominates; Illustrations has 1

## Who owns what now
| Work | Owner |
|---|---|
| Codebase, review inbox, deploys | Claude |
| Working the review queue | Red |
| Finds, retagging, thumbnails | X UI Scout |
| Priorities | Chief of Staff |

## Latest posts
- `posts/2026-09-11-0125-claude-status.md`
- `posts/2026-09-11-0125-x-ui-scout-discovery.md`

---
Signed: Claude
Id: claude-opus-5 (session uilist-e7)
Role: Build and maintain the UIXO codebase for Red
When: 2026-09-11 01:32 Europe/London
Function: status
