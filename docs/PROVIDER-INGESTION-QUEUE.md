# Provider ingestion queue

Audit started 20 September 2026 from main `7ea42aaab05d74b1d4f4e626f57e41e9619d9c78`.
This document distinguishes source review, implementation, preview acceptance and production publication. A captured input is not approval.

## Production baseline

The production status and provider endpoints were read on 20 September 2026 at 01:00-01:02 UTC. Build `7ea42aaab05d`, persistent Postgres, 464 assets across seven providers.

| Provider | Live records | Record level |
| --- | ---: | --- |
| shadcn/ui | 53 | Components |
| Magic UI | 68 | Components |
| Motion Primitives | 33 | Components |
| Simply Buttons | 108 | Components, existing non-standard reuse guidance |
| Animata | 200 | Components |
| Lucide | 1 | Icon pack |
| Heroicons | 1 | Icon pack |

These are observed existing records, not a retrospective certification against the new provider requirements. Existing IDs, records and visual design must not be changed by this ingestion batch.

## Ordered React web queue

| Order | Provider | State | Expected components | Added / live in this batch |
| --- | --- | --- | --- | --- |
| 1 | Kibo UI | Source/licence review in progress | Inventory under review | 0 / 0 |
| 2 | Dice UI | Not yet audited | Unknown | 0 / 0 |
| 3 | UIAble | Not yet audited | Unknown | 0 / 0 |
| 4 | Flowbite React | Not yet audited | Unknown | 0 / 0 |
| 5 | HeroUI Web | Not yet audited | Unknown | 0 / 0 |
| 6 | Fancy Components | Not yet audited | Unknown | 0 / 0 |
| 7 | EvilCharts | Not yet audited | Unknown | 0 / 0 |
| 8 | Kokonut UI | Not yet audited | Unknown | 0 / 0 |
| 9 | MapCN | Not yet audited | Unknown | 0 / 0 |
| 10 | Babelize Elements | Not yet audited | Unknown | 0 / 0 |
| 11 | Spectrum UI | Not yet audited | Unknown | 0 / 0 |
| 12 | MicroInteractions UI | Not yet audited | Unknown | 0 / 0 |
| 13 | BadtzUI | Not yet audited | Unknown | 0 / 0 |
| 14 | Tailark | Not yet audited | Unknown | 0 / 0 |
| 15 | 8bitcn/ui | Not yet audited | Unknown | 0 / 0 |

### Kibo UI audit in progress

- Website: https://www.kibo-ui.com/
- Official repository, linked by the website: https://github.com/shadcnblocks/kibo
- Branch: `main`.
- Exact upstream commit: `3d63cdb15b79d972e3dc38a10997987672f9b263`.
- Licence: MIT text at `license.md`, https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/license.md.
- Commercial use and redistribution: permitted by the reviewed root licence with copyright and permission notices retained; dependency and asset rights still require inspection.
- Stable inventory: pinned `packages/` tree; component packages must be separated from patterns, supporting shadcn primitives and build configuration.
- Preview strategy: review official isolated demos first. The inspected app routes have no dedicated component preview route. Whole documentation pages are not an acceptable substitute; exact-source local rendering may be necessary.
- Installation strategy: retain the upstream registry and package metadata; do not guess dependencies or installation routes.
- Exclusions: patterns, paid products and supporting infrastructure are outside this component batch.
- Unresolved: complete package inventory, installation/dependency evidence, truthful previews, browser verification and release approval.

## Permanent boundaries

`src/content/resources.json` is the website directory, not the ingestion allowlist. Only explicitly approved providers in `registry/providers.ts` may enter the asset catalogue.

React Bits remains a directory link only. The Commons Clause redistribution restriction makes it unsuitable for this ingestion project. Do not ingest 21st.dev.

Icon providers are pack-only. Lucide and Heroicons already have one pack-level record each; never enumerate individual glyphs as new catalogue assets.

React Native future queue: HeroUI Native, Reactix, Native Bloom, RN Neo, Make It Animated and React Native Motion. None may enter the web-component catalogue until a visible platform filter and platform-specific compatibility rules exist.

## Progress and release gates

- [x] Read current main documentation, provider code, tests and database sync implementation.
- [x] Observe production baseline without database writes.
- [ ] Complete each provider audit before implementing publication.
- [ ] Retain licence text and immutable reviewed snapshots.
- [ ] Validate parsing, limits, deduplication, actual previews and additive database sync.
- [ ] Run lint, typecheck, tests and production build.
- [ ] Verify deployed previews in light and dark at desktop and narrow widths.
- [ ] Confirm the exact Vercel production Neon branch before any production write.
- [ ] After merge and release approval, synchronise only reviewed new providers and record resulting counts.

No production database action has been performed. The current global `syncCaptured` updates existing provider records and assets, so it must not be used unscoped to publish this batch.
