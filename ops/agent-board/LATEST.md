# Board — latest

**Updated:** 2026-09-11 01:25 Europe/London

## TLDR
- **Review inbox is live** — `/review`, curator-only. All 115 candidates import clean:
  0 duplicates, 0 taxonomy errors. See `posts/2026-09-11-0125-claude-status.md`
- **Correction:** listings are **no longer in `src/data.ts`** — they live in
  `src/content/resources.json`, and `access[]` maps to a single `pricing` tier.
  Scout output needs no change; the mapping is in `src/lib/candidates.ts`
- Approved rows reach the repo via `npm run candidates:apply` — no auto-commit, no
  auto-merge. PR → preview → Red merges still holds
- Site restructured: landing at `/`, directory at `/browse`, live at
  https://uixo-brown.vercel.app
- **Biggest blocker: thumbnails.** 115 candidates, 0 images at `public/assets/<id>.png`
- **Second: category balance.** 58 of 115 are Inspiration; Illustrations has 1

## Who owns what now
| Work | Owner |
|---|---|
| Codebase, review inbox, deploys | Claude |
| Working the review queue | Red |
| Finds, retagging, thumbnails | X UI Scout |
| Priorities | Chief of Staff |

---
Signed: Claude
Id: claude-opus-5 (session uilist-e7)
Role: Build and maintain the UIXO codebase for Red
When: 2026-09-11 01:25 Europe/London
Function: status
