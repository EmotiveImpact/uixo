# Provider ingestion queue

Updated 20 September 2026. Started from main `7ea42aaab05d74b1d4f4e626f57e41e9619d9c78`.
Work is in draft PR #44 on `astra/provider-ingestion-2026-09-20`. No merge or remote
registry publication has been performed.

**Current result: ten Kibo records implemented and source-reviewed; 40 isolated browser
checks passed; hosted catalogue acceptance is blocked. This is not a completed production
provider release.** The other fourteen providers remain queued, not falsely approved.

## Already live providers

Production status/provider endpoints were read on 20 September 2026. The baseline is
464 records across seven providers, build `7ea42aaab05d`, persistent Postgres. The review
branch's read-only evaluation snapshot has 474 records across eight providers. These are
separate states, not evidence that production was synchronised.

- shadcn/ui: **53 components**. Retained SHA `2b3e6d4f8d9161fe5c19340dc383aade392012dd`;
  MIT, `LICENSE.md`, `data/registry/licences/shadcn.txt`.
- Magic UI: **68 components**. Retained SHA `52bc69354621e5cd7c9bc84a0e42b42f2d0c07b1`;
  MIT, `LICENSE.md`, `data/registry/licences/magic-ui.txt`.
- Motion Primitives: **33 components**. Retained SHA `40f59b61e567712aa8329c7dc8c2ced763054c34`;
  MIT, `LICENCE.md`, `data/registry/licences/motion-primitives.txt`.
- Simply Buttons: **108 components**. Retained SHA `d76ed2a67cc2fc7fbfa14d62d0704668d20e415d`;
  README reuse guidance, `data/registry/licences/simply-buttons.txt`. Commercial and
  redistribution permissions remain unknown, not a newly certified permissive licence.
- Animata: **200 components**. Retained SHA `36674e4e9cfdc0f237693d8b736a2bf41065ca1d`;
  MIT, `LICENSE.md`, `data/registry/licences/animata.txt`.
- Lucide: **one icon pack**. Legacy retained snapshot is unpinned; ISC plus inherited MIT
  notices in `data/registry/licences/lucide.txt`.
- Heroicons: **one icon pack**. Legacy retained snapshot is unpinned; MIT text in
  `data/registry/licences/heroicons.txt`.

Counts are observed live counts; SHA/licence references above describe the repository's
retained snapshots, not a fresh inspection of every production asset payload. The existing
local live-demo/source-lock manifests, captured preview manifest and Animata Storybook
snapshot retain their respective preview strategies. These legacy records are not being
retrospectively certified against the new rules. Their IDs, names and metadata were preserved:
all **464 existing validated asset fingerprints are unchanged** against the main baseline.

## Ordered React web queue

“Implemented” means included in this PR's evaluation snapshot, not published to production.
Unknown expected counts are deliberately not guessed from website marketing.

1. **Kibo UI:** 40 React component packages expected; 10 implemented, 30 blocked; 0 newly
   published in production. Source review approved for the ten-record batch only; release
   remains blocked by hosted preview acceptance below.
2. **Dice UI:** next, not yet audited. Expected unknown; implemented 0; published 0.
3. **UIAble:** not yet audited. Expected unknown; implemented 0; published 0.
4. **Flowbite React:** not yet audited. Expected unknown; implemented 0; published 0.
5. **HeroUI Web:** not yet audited. Expected unknown; implemented 0; published 0.
6. **Fancy Components:** not yet audited. Expected unknown; implemented 0; published 0.
7. **EvilCharts:** not yet audited. Expected unknown; implemented 0; published 0.
8. **Kokonut UI:** not yet audited. Expected unknown; implemented 0; published 0.
9. **MapCN:** not yet audited. Expected unknown; implemented 0; published 0.
10. **Babelize Elements:** not yet audited. Expected unknown; implemented 0; published 0.
11. **Spectrum UI:** not yet audited. Expected unknown; implemented 0; published 0.
12. **MicroInteractions UI:** not yet audited. Expected unknown; implemented 0; published 0.
13. **BadtzUI:** not yet audited. Expected unknown; implemented 0; published 0.
14. **Tailark:** not yet audited. Expected unknown; implemented 0; published 0.
15. **8bitcn/ui:** not yet audited. Expected unknown; implemented 0; published 0.

## Kibo UI audit

**Identity.** Website: https://www.kibo-ui.com/. Official repository:
https://github.com/shadcnblocks/kibo, linked from the provider website and reciprocal README.
Branch `main`, immutable upstream SHA `3d63cdb15b79d972e3dc38a10997987672f9b263`.
The reviewed root licence is MIT at
[license.md](https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/license.md).
The [complete retained text](../data/registry/licences/kibo-ui.txt) is 1,068 bytes, SHA-256
`1fe9198b595ddadef7e2d99e3e1698c036db61c81e91c7b42df90d59f563b2ba`.
Commercial use and redistribution are allowed by that licence with notices retained;
this is not blanket permission for third-party media, trademarks or every dependency.

**Inventory.** The pinned `packages/` tree, `apps/docs/app/r/registry.json/route.ts` and
`apps/docs/lib/package.ts` identify 44 package entries: 40 React component packages and
four excluded entries. The [immutable reviewed snapshot](../data/registry/snapshots/kibo-ui-3d63cdb15b79d972e3dc38a10997987672f9b263.json)
has SHA-256 `4ee2799dcd1d4066ecf6e63ab2cfe045d83195119df6e599c3476edf62a95926`.
It retains all inventory decisions, ten records and 58 original source/evidence files with
lengths and hashes. No paid product, block or pattern catalogue is included by this adapter.

**Preview.** No suitable official isolated component URL was established in the reviewed
app routes. The chosen strategy is local rendering of the unchanged official default
example and its pinned dependency closure. Whole documentation pages and replacement
artwork are not substitutes. The separate `provider-demos/kibo-ui` build uses locked
packages, verified workspace aliases and exact upstream theme/token/base CSS before the
reviewed `/* Custom */` boundary. Documentation-shell imports/directives are excluded;
provider components/examples remain byte-identical. Host sizing and scroll containment
are wrappers, not redesigned components.

The iframe has only `sandbox="allow-scripts"`, with no same-origin permission. Its CSP
blocks network connections, nested frames, forms and media. Preview routing is a finite
ten-ID mapping and requires the exact pinned component source URL and matching variant
SHA. No new arbitrary iframe origin or proxy is allowed. A runtime error clears readiness;
a late ready message cannot silently mask it. Loading/failed previews are labelled as such,
not as a working “Live demo”. A failure links to the source, never to substitute artwork.

**Installation.** The pinned `scripts/index.ts`, registry generator, component package
metadata and docs retain the upstream `https://www.kibo-ui.com/r/<slug>.json` installation
route, shadcn CLI instruction, package versions and registry dependencies. Provider tags
are retained. The live upstream installation URL can change; it is not claimed to be the
same immutable object as the locally pinned preview. UIXO shows guidance and never runs
an installation automatically.

**Ten implemented records and shared categories.** Announcement, Banner and Status map to
`feedback`; Combobox, Rating, Tags and Theme Switcher to `forms`; Dialog Stack to `overlays`;
Relative Time and Tree to `data-display`. Stable IDs are `kibo-ui/<upstream-slug>`.

### Exclusions and blocked records

Four entries are excluded, not counted as failed React components: `patterns` is a separate
pattern catalogue; `shadcn-ui` contains supporting primitives that must not duplicate the
existing shadcn provider; `typescript-config` is build configuration; `typography` is a
CSS-only `registry:style` entry.

The 30 unimplemented React packages have these recorded blockers:

- **13 require complete pinned preview/dependency closure and browser review:** `calendar`,
  `code-block`, `color-picker`, `contribution-graph`, `cursor`, `dropzone`, `editor`, `gantt`,
  `image-crop`, `kanban`, `list`, `mini-calendar`, `table`.
- **12 require preview and third-party media/branding/service review:** `avatar-stack`,
  `comparison`, `credit-card`, `deck`, `image-zoom`, `marquee`, `pill`, `qr-code`, `reel`,
  `snippet`, `stories`, `video-player`. The default examples include remote media, branding
  or external service input. This is a review gap, not a claim that reuse is prohibited.
- **Two have unproven consumer installation:** `choicebox` and `spinner` contain
  `@repo/shadcn-ui` workspace imports not rewritten by the inspected registry generator/CLI.
- **Three have distinct runtime requirements:** `glimpse` needs reviewed server/network
  handling; `sandbox` executes an external Sandpack environment requiring an isolation
  review; `ticker` requires `NEXT_PUBLIC_LOGO_DEV_TOKEN` and a remote logo service.

All 30 stay out of the catalogue. The ten implemented records also remain **unpublished in
production** until the separate release blockers below are resolved.

### Validation completed

At `a4654a74289e3b35c9da63dc277085e785dee5d0`,
[CI run 35495448384](https://github.com/EmotiveImpact/uixo/actions/runs/35495448384)
passed locked dependency installs, formatting, lint, explicit typecheck, 205 application
tests and the complete production build. The build includes 77 registry tests, one real
MCP contract test, all 58 Kibo source/evidence integrity checks and 277 prerendered pages.
Lint has one non-blocking Fast Refresh entry-point warning, not zero warnings.

`tests/browser/kibo.py` passed **40/40** real-component cases: all ten original examples in
light/dark, at 960 px/360 px, with component-specific content/state assertions and parent
source-checked theme updates. This local deployment-header emulation does not constitute
hosted catalogue acceptance. The existing application browser/network suite also passed.

[Retained CI artifact](https://github.com/EmotiveImpact/uixo/actions/runs/35495448384/artifacts/10600488644):
SHA-256 `ee4488cdc78bb1b89b0fcde552bafb45316927ac7c8f2e32b02d357e040bf0dc`.
It contains the actual screenshots/results and build/application/network logs. GitHub
artifacts expire after seven days; the audit summary is retained in this repository.

Two browser-test defects were corrected against unchanged upstream code: Combobox opens
from a button, not a combobox-role trigger, and SVG-only Rating must be checked for rendered
controls rather than non-empty text. Neither fix bypasses component execution or replaces
source. Separate regressions cover parser limits, duplicates, SHA/preview mismatches,
immutable evidence, category/dependency preservation, additive sync, provider revocation,
concurrent changes and failure labels.

### Hosted acceptance blocker

The authenticated deployed catalogue at commit `c9c039fa99b5337b77da3f7be1e89ed80653dda2`
returned the expected read-only 474/8 status, ten Kibo records and matching source, licence,
installation and HTML header evidence. But **0/40 hosted card/detail cases completed**:
the first iframe did not become ready. Run `35496220565` is a failed acceptance run.

The follow-up diagnostic at commit `4b6cba8b1e2636ab1db983da99bf0c118fbf4106`, deployment
`dpl_EQF8cSE6oZ24rNG1JvtC9DcLKWny`, establishes the narrower failure: iframe HTML returns
200 with the intended CSP/CORS headers after its clean-URL redirect; its module and CSS
requests from origin `null` fail CORS because their responses lack
`Access-Control-Allow-Origin`. The same module returns 200 JavaScript through the authorised
HTTP session. Deployment protection for anonymous subresources is suspected, not presented
as a definitively fixed cause. The empty iframe is never accepted as a real preview.

[Diagnostic artifact](https://github.com/EmotiveImpact/uixo/actions/runs/35496569151/artifacts/10600711092):
SHA-256 `ec7e49d855481c4183317a0b613412955dc881d21077e2fe3aa9cdcad363425e`.
A successful diagnostic run means evidence was captured, **not** that browser acceptance
passed. No response mocks, cookie values or secrets are in that evidence. Temporary
session/private-key files were destroyed by the runner. One-time handoff workflows are
removed from the final source tree.

Before publication, establish approved automated access for the protected preview's
subresources and verify actual script/CSS response headers. Vercel documents
[automation access for protected deployments](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
A share-link session alone did not make these opaque frames load. Do not add same-origin
sandbox permission, disable project protection broadly or introduce a proxy to make the
check green. Repeat `tests/browser/kibo_hosted.py` against the accepted deployed commit in
both themes at 1440 px/390 px. Its source/preview/install assertions must all pass.

### Remaining risks

Third-party preview notices are version/npm-integrity/repository/hash bound in
`data/registry/snapshots/kibo-preview-dependency-notices.json`. One npm dependency,
`react-remove-scroll-bar@2.3.8`, declares MIT but its published gitHead was unavailable in
GitHub. Its supplement explicitly retains MIT text from a separately pinned revision of
the same official repository, not a falsely claimed matching code revision.

The root dependency install reported six npm audit findings: one low, two moderate and
three high. These are not silently fixed by upgrading unrelated application dependencies.
The isolated Kibo lock reported zero at that observed install, not a permanent guarantee.
Original example-specific overflow, accessibility and layout behaviour remain upstream
behaviour; no claim of comprehensive accessibility or responsive certification is made.

## Link-only, excluded and pack-only sources

`src/content/resources.json` remains the website directory. It never approves an ingestion
adapter. Only explicitly reviewed entries in `registry/providers.ts` can supply assets.

**React Bits is link-only** under this project's Commons Clause restriction. Do not ingest
its components. **21st.dev is excluded from ingestion.** Neither has been added as a provider.
**Icon sources are pack-only:** Lucide and Heroicons each remain one catalogue record; no
individual icons were ingested or renamed. Additional icon providers need their own audits.

## React Native future queue

HeroUI Native, Reactix, Native Bloom, RN Neo, Make It Animated and React Native Motion remain
outside the React web catalogue. A visible platform filter and platform-specific preview,
compatibility and installation rules are required before their separate audits/publication.
They are future sources, not implicitly approved web providers.

## Progress and release gates

- [x] Read main documentation, provider implementation, tests and database sync workflow.
- [x] Observe production without database writes and preserve the directory/registry split.
- [x] Audit the Kibo source, root licence, inventory and ten selected example/dependency closures.
- [x] Retain complete licence evidence and the immutable reviewed snapshot.
- [x] Implement ten truthful pinned previews and additive provider-scoped sync.
- [x] Preserve all 464 existing validated asset fingerprints.
- [x] Pass clean installs, format, lint, typechecks, tests and production build.
- [x] Pass 40 isolated original-component browser cases.
- [x] Capture and document the actual hosted loading failure without weakening isolation.
- [ ] Pass all hosted catalogue card/detail/theme/viewport checks.
- [ ] Confirm the exact current Vercel production Neon branch.
- [ ] Merge only after review and release acceptance; never automatically.
- [ ] Back up and publish through the scoped additive command; record actual counts.
- [ ] Repeat production light/dark and desktop/narrow checks after publication.
- [ ] Continue to Dice UI after resolving the Kibo release blockers.

## Post-merge database action, not performed

Do **not** use global `registry:sync` for this batch: it updates old provider/asset records
and exclusions. The new command defaults to a dry run and preserves conflicts/revocations.
Neither a Postgres status response nor the name `UIXO_DATABASE_URL` proves a Neon branch.
Independently match the accepted Vercel production environment's connection endpoint to
Neon's branch metadata, take the backup and record both IDs without exposing credentials.

Set the server-side connection securely and supply `UIXO_EXPECTED_DB_HOST`,
`UIXO_EXPECTED_DB_NAME`, `UIXO_CONFIRMED_NEON_BRANCH_ID`, and
`UIXO_CONFIRMED_VERCEL_DEPLOYMENT_ID`. These are operator attestations checked against the
connection host/name, not automatic proof of Vercel-to-Neon ownership. Then, only after the
hosted gate is passed and merge/release review is complete:

```sh
npm run registry:sync-reviewed -- kibo-ui --allow-remote
# Inspect the dry run. Record UIXO_OPERATOR_ID and UIXO_REVIEW_REASON securely.
npm run registry:sync-reviewed -- kibo-ui --allow-remote --apply
```

Expected first publication: ten inserted, none replaced/deleted. Expected repeat: zero
inserted and ten unchanged. Differing provider metadata, revocation, asset fingerprints
or existing review history require manual review rather than overwrite. A concurrent
conflict can leave an inspected partial additive batch; it never justifies bypassing review.

Actual remote insertion in this work: **0**. Disposable in-memory SQLite sync tests are not
production or preview Neon operations. Publication remains blocked, and PR #44 stays draft.
