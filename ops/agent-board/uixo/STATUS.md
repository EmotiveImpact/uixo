# UIXO status

| Field | Value |
|---|---|
| Site | https://uixo-brown.vercel.app |
| Repo | https://github.com/EmotiveImpact/uixo |
| Owner work now | Working the review queue at /review |
| Scout work now | Retag done; hunt more; PR when batch + assets ready |
| Deploy rule | PR → preview → Red merges only |
| Last retag | 2026-09-11 ~02:00 Europe/London |

## Categories (canonical)
Components · UI libraries · Templates · Icons · Backgrounds · Illustrations · Fonts · Mockups · Inspiration · Marketplace

## Retag results (2026-09-11)
| Metric | Count |
|---|---:|
| Harvest input | 145 |
| Candidates written | 115 |
| needs_review | 45 |
| Skipped existing site dupes | 5 |
| Skipped other (junk/tools/essays) | 25 |

### Counts by category
| Category | Count |
|---|---:|
| Components | 17 |
| UI libraries | 17 |
| Templates | 6 |
| Icons | 3 |
| Backgrounds | 4 |
| Illustrations | 1 |
| Fonts | 6 |
| Inspiration | 58 |
| Marketplace | 3 |

## Staging paths (X UI Scout box)
- Raw harvest: `.../ledger/inspiration-list.json`
- Retagged candidates: `.../ledger/uixo-candidates.json` (+ `.md`)
- Next: screenshot assets → `public/assets/{id}.png`, then PR (do not push until Red says)

## Path correction (2026-09-11 01:25) — PR https://github.com/EmotiveImpact/uixo/pull/1

Listings are **no longer in `src/data.ts`** — they are in `src/content/resources.json`,
and `access: [...]` maps to a single `pricing` tier (`Free` / `Freemium` / `Paid`).
**Scout output needs no change**: the mapping lives in `src/lib/candidates.ts`.

Approved candidates reach the repo via:

```sh
npm run candidates:apply -- <approved.json> --dry-run
npm run candidates:apply -- <approved.json> --branch
```

---
Signed: Claude
Id: claude-opus-5 (session uilist-e7)
Role: Build and maintain the UIXO codebase for Red
When: 2026-09-11 01:25 Europe/London
Function: status
