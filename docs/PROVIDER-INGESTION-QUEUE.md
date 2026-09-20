# Provider ingestion queue

Audit started 20 September 2026 from main `7ea42aaab05d74b1d4f4e626f57e41e9619d9c78`.
This document distinguishes source review, implementation, preview acceptance and production publication. A captured input is not approval.

## Production baseline

The production status and provider endpoints were read on 20 September 2026 at 01:00-01:02 UTC. Build `7ea42aaab05d`, persistent Postgres, 464 assets across seven providers.

| Provider          | Live records | Record level                                     |
| ----------------- | -----------: | ------------------------------------------------ |
| shadcn/ui         |           53 | Components                                       |
| Magic UI          |           68 | Components                                       |
| Motion Primitives |           33 | Components                                       |
| Simply Buttons    |          108 | Components, existing non-standard reuse guidance |
| Animata           |          200 | Components                                       |
| Lucide            |            1 | Icon pack                                        |
| Heroicons         |            1 | Icon pack                                        |

These are observed existing records, not a retrospective certification against the new provider requirements. Existing IDs, records and visual design must not be changed by this ingestion batch.

## Ordered React web queue

| Order | Provider             | State                                                         | Expected components | Added / live in this batch |
| ----- | -------------------- | ------------------------------------------------------------- | ------------------- | -------------------------- |
| 1     | Kibo UI              | 10 source-reviewed records implemented; release gates pending | 40 React components | 10 / 0                     |
| 2     | Dice UI              | Not yet audited                                               | Unknown             | 0 / 0                      |
| 3     | UIAble               | Not yet audited                                               | Unknown             | 0 / 0                      |
| 4     | Flowbite React       | Not yet audited                                               | Unknown             | 0 / 0                      |
| 5     | HeroUI Web           | Not yet audited                                               | Unknown             | 0 / 0                      |
| 6     | Fancy Components     | Not yet audited                                               | Unknown             | 0 / 0                      |
| 7     | EvilCharts           | Not yet audited                                               | Unknown             | 0 / 0                      |
| 8     | Kokonut UI           | Not yet audited                                               | Unknown             | 0 / 0                      |
| 9     | MapCN                | Not yet audited                                               | Unknown             | 0 / 0                      |
| 10    | Babelize Elements    | Not yet audited                                               | Unknown             | 0 / 0                      |
| 11    | Spectrum UI          | Not yet audited                                               | Unknown             | 0 / 0                      |
| 12    | MicroInteractions UI | Not yet audited                                               | Unknown             | 0 / 0                      |
| 13    | BadtzUI              | Not yet audited                                               | Unknown             | 0 / 0                      |
| 14    | Tailark              | Not yet audited                                               | Unknown             | 0 / 0                      |
| 15    | 8bitcn/ui            | Not yet audited                                               | Unknown             | 0 / 0                      |

### Kibo UI: reviewed first batch

| Audit field                     | Evidence / decision                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                        | Kibo UI (`kibo-ui`)                                                                                                                                                                                                                                                                                                              |
| Website                         | https://www.kibo-ui.com/                                                                                                                                                                                                                                                                                                         |
| Official repository             | https://github.com/shadcnblocks/kibo, linked by the official website and reciprocal README                                                                                                                                                                                                                                       |
| Branch / exact upstream SHA     | `main` / `3d63cdb15b79d972e3dc38a10997987672f9b263`                                                                                                                                                                                                                                                                              |
| Licence                         | MIT, root `license.md`; [pinned source](https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/license.md), [retained complete text](../data/registry/licences/kibo-ui.txt)                                                                                                                          |
| Commercial use / redistribution | Allowed by that licence with copyright/permission notices retained. Dependency notices are emitted with the preview build; this is not a blanket trademark or third-party-media clearance.                                                                                                                                       |
| Stable inventory                | Pinned `packages/` tree plus `apps/docs/app/r/registry.json/route.ts` and `apps/docs/lib/package.ts`                                                                                                                                                                                                                             |
| Expected upstream count         | 44 package entries: 40 React component packages, one CSS-only entry and three supporting/pattern entries                                                                                                                                                                                                                         |
| Actual batch count              | 10 reviewed component records, 30 blocked React components, four excluded non-component/pattern entries                                                                                                                                                                                                                          |
| Production publication          | **0 new records**. Existing production remains 464 records until an approved post-merge release.                                                                                                                                                                                                                                 |
| Preview strategy                | Local React rendering of each unchanged official default example and its exact-source dependency closure. No official isolated component route was established in the inspected app routes. Whole docs pages and invented images are not substituted.                                                                            |
| Preview isolation               | Separate locked dependency tree under `provider-demos/kibo-ui`; `sandbox="allow-scripts"` without same-origin; no network, nested frames, forms or media under the deployed CSP. Ten exact local routes, not an arbitrary iframe proxy.                                                                                          |
| Installation strategy           | Exact per-component upstream `/r/<slug>.json` URL and shadcn CLI recipe from pinned `scripts/index.ts`; package dependency versions and registry dependencies retained from source. The upstream installation URL is mutable, unlike the pinned preview, and the UI warns before acquisition.                                    |
| Source integrity                | [Immutable reviewed snapshot](../data/registry/snapshots/kibo-ui-3d63cdb15b79d972e3dc38a10997987672f9b263.json), SHA-256 `4ee2799dcd1d4066ecf6e63ab2cfe045d83195119df6e599c3476edf62a95926`. All 58 source/evidence files have byte lengths and SHA-256 hashes. Builds fail on drift, missing files or unknown source revisions. |
| Style adaptation                | Exact upstream theme/token/base CSS before the documented `/* Custom */` boundary, excluding documentation-shell imports and source directives. Components and official examples remain byte-for-byte upstream. UIXO's visual design is unchanged.                                                                               |
| Exclusions                      | Paid products, patterns, infrastructure and the CSS-only typography entry are not component records. No individual icons are ingested.                                                                                                                                                                                           |
| Unresolved risks                | Full clean-install/build/browser checks and hosted acceptance are pending at this checkpoint. The official install endpoint may change independently of the pinned source. Other 30 components require their own preview/dependency/installation audit.                                                                          |

The ten records are Announcement, Banner, Combobox, Dialog Stack, Rating, Relative Time,
Status, Tags, Theme Switcher and Tree. Each has its own original implementation and
example, shared UIXO category, provider tags and declared dependencies. Re-running the
adapter does not follow upstream `main` or invent new records.

#### Blocked and excluded Kibo inventory

These reasons concern this batch's evidence, not a claim that a component can never be supported.

| Upstream entry       | Status   | Exact blocker / exclusion                                                                                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `avatar-stack`       | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `calendar`           | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `choicebox`          | blocked  | Component contains @repo/shadcn-ui workspace imports; the inspected registry generator/CLI does not rewrite these. Consumer installation is not proven. |
| `code-block`         | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `color-picker`       | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `comparison`         | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `contribution-graph` | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `credit-card`        | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `cursor`             | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `deck`               | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `dropzone`           | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `editor`             | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `gantt`              | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `glimpse`            | blocked  | Server-dependent link preview requires separately reviewed network/SSR handling.                                                                        |
| `image-crop`         | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `image-zoom`         | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `kanban`             | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `list`               | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `marquee`            | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `mini-calendar`      | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `patterns`           | excluded | Pattern catalogue is outside this component batch.                                                                                                      |
| `pill`               | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `qr-code`            | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `reel`               | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `sandbox`            | blocked  | Executes an external Sandpack environment; isolation and network policy not reviewed.                                                                   |
| `shadcn-ui`          | excluded | Supporting primitives; must not duplicate the shadcn provider.                                                                                          |
| `snippet`            | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `spinner`            | blocked  | Component contains @repo/shadcn-ui workspace imports; the inspected registry generator/CLI does not rewrite these. Consumer installation is not proven. |
| `stories`            | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |
| `table`              | blocked  | No source-pinned preview/dependency closure and four-mode browser acceptance reviewed in this batch.                                                    |
| `ticker`             | blocked  | Official example requires NEXT_PUBLIC_LOGO_DEV_TOKEN and remote logo service; no safe, complete preview reviewed.                                       |
| `typescript-config`  | excluded | Build configuration, not a component.                                                                                                                   |
| `typography`         | excluded | CSS-only registry:style entry, not a React TSX component.                                                                                               |
| `video-player`       | blocked  | Official default example includes remote media, branding or external service input; complete preview and third-party asset rights not reviewed.         |

## Permanent boundaries

`src/content/resources.json` is the website directory, not the ingestion allowlist. Only explicitly approved providers in `registry/providers.ts` may enter the asset catalogue.

React Bits remains a directory link only. The Commons Clause redistribution restriction makes it unsuitable for this ingestion project. Do not ingest 21st.dev.

Icon providers are pack-only. Lucide and Heroicons already have one pack-level record each; never enumerate individual glyphs as new catalogue assets.

React Native future queue: HeroUI Native, Reactix, Native Bloom, RN Neo, Make It Animated and React Native Motion. None may enter the web-component catalogue until a visible platform filter and platform-specific compatibility rules exist.

## Progress and release gates

- [x] Read current main documentation, provider code, tests and database sync implementation.
- [x] Observe production baseline without database writes.
- [x] Audit Kibo's official source, root licence, inventory and the ten selected dependency/example closures.
- [x] Retain the complete licence and immutable reviewed snapshot.
- [x] Implement ten exact-source previews, finite route/acquisition allowlists and an additive, provider-scoped sync.
- [x] Run existing core tests and new parsing, limit, deduplication, preview-contract and database-sync tests: **33 passed**.
- [x] Compare all 464 original validated fingerprints against the baseline: **unchanged**.
- [ ] Generate the isolated dependency lock and pass a clean dependency install.
- [ ] Pass formatting, lint, application and isolated-preview typechecks, application tests and production build.
- [ ] Pass the real-browser matrix: ten original examples, light/dark, 960/360 px, interactions and source-checked theme updates.
- [ ] Verify the branch deployment in the actual UIXO catalogue. A local header emulation or isolated frame test is not hosted catalogue acceptance.
- [ ] Confirm the exact current Vercel production Neon branch before any production write.
- [ ] After merge and release approval, synchronise only reviewed new providers and record resulting counts.
- [ ] Repeat production light/dark and desktop/narrow acceptance after publication.

### Validation evidence at the implementation checkpoint

`node --experimental-strip-types --test tests/registry/core.node.ts` passed all 25 baseline tests.
The expanded command with `tests/registry/kibo.node.ts` passed all 33 tests. The source
preparation script verified 58 byte-identical Kibo files. Python browser-script syntax was
checked, but that alone is not a browser test. Initial local `npm ci` could not complete
because this execution environment could not resolve the npm registry; clean CI checks
remain required and must not be represented as passed.

### Safe post-merge database action

No production database action has been performed. Do **not** use global `registry:sync`
for this batch: it can update old providers, assets and exclusions.

First prove, using Vercel's production environment binding and Neon's endpoint/branch
metadata, which database the accepted production deployment actually uses. A status API
showing Postgres or a variable named `UIXO_DATABASE_URL` is not that proof. Back up that
branch and record the deployment ID and branch ID. Keep preview/account/auth environments
separate and never print credentials in logs or documentation.

The new additive CLI defaults to a dry run. Set the server-side connection securely and
supply the verified, non-secret identity confirmations:
`UIXO_EXPECTED_DB_HOST`, `UIXO_EXPECTED_DB_NAME`,
`UIXO_CONFIRMED_NEON_BRANCH_ID` and `UIXO_CONFIRMED_VERCEL_DEPLOYMENT_ID`.
Those values are an operator attestation checked against the connection host/name, not
a substitute for independently verifying the Vercel/Neon mapping.

```sh
npm run registry:sync-reviewed -- kibo-ui --allow-remote
# After inspecting the dry run and recording UIXO_OPERATOR_ID / UIXO_EDITORIAL_REASON:
npm run registry:sync-reviewed -- kibo-ui --allow-remote --apply
```

A first accepted run should insert ten records; a repeat should insert zero and report
ten unchanged. Existing provider edits/revocations, differing asset fingerprints and
prior review history stop the operation rather than being overwritten. No existing IDs
are renamed or deleted. Concurrent conflicts may leave a partial additive batch requiring
inspection, but never justify overwriting an existing row or bypassing review.

### Continuation order

Complete Kibo's remaining gates before proceeding to Dice UI. The remaining fourteen
providers are queued, not audited or approved, and their counts are deliberately unknown.
