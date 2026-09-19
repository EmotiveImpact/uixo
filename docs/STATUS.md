# UIXO v2 status

## Main and next product package, 19 September 2026

Registry Intelligence V1 is merged into `main` through PR #34 at merge commit
`812f29c4d27df1138490361b62a171732386d530`.

The next product package is **UIXO Discovery V2**, explicitly the completion sprint inside
**Product Phase 1 — Registry + Discovery foundation**. It makes Assets, Collections and Sources
first-class public navigation; exposes Registry Health, Operations, Editorial and Indexing to
authorised curators; publishes reviewed starter collections; improves visible source/provenance
context; and completes the persistent Registry Intelligence activation/acceptance work.

See [UIXO Discovery V2](UIXO-DISCOVERY-V2.md) and the
[master roadmap](PRODUCT-ROADMAP.md). The informal “70% done / 30% remaining” description is
planning shorthand rather than a measured completion percentage; Phase 1 completion is determined
by the acceptance gates in those documents.

Important current release caveat: merging PR #34 did **not** itself run `004-intelligence.sql`
against a production database or activate Grok/Eve. The merged main commit's GitHub Actions browser
acceptance is also still failing, while the application/registry/MCP verification and Vercel build
have otherwise passed their previously recorded checks. Discovery V2 includes fixing that release
acceptance rather than treating hidden routes as a finished product.

## Registry Intelligence V1, 19 September 2026

The next source build adds evidence coverage, provider profiles, private/published editorial asset
collections, a linked candidate/job/revision operations board, structured opt-in GitHub scout intake,
six bounded Eve tools and three additional public MCP tools. See
[Registry Intelligence V1](REGISTRY-INTELLIGENCE-V1.md) for routes, permissions, migration and live
acceptance gates. This entry describes source/test implementation, not a production database
migration, live Grok activation or deployed Eve execution. The bundled test catalogue is now
264 published discovery records from six approved providers; older figures below are historical.

For product editions and delivery phases, see the [master roadmap](PRODUCT-ROADMAP.md). For the later UI and favourites repairs and current engineering priorities, see the [12 September audit](PRODUCT-AUDIT-2026-09-12.md). The integration-repair sections below retain their original verification context.

## Current outcome

The entire v2 brief is **not complete**. The application has reliable account favourites, 147 official component demo captures and visitor asset discovery connected to the registry. The bundled evaluation catalogue contains 168 source-backed records from five approved providers, including commit-pinned Magic UI and Motion Primitives catalogues. Seven Magic UI manifest entries are withheld because their source files are absent at the pinned commit. Deploying the code does not seed an existing persistent registry; an operator must run the explicit seed/index workflow and review production counts.

## Implemented in the branch before this repair

Repository inspection at `24261b6231cd8edc775bfdd4474cb53da31e5cd8` found registry/domain/schema code, three source integrations, a 67-record captured metadata snapshot, paginated search, licence-aware acquisition recipes, review/scout/job routes, six MCP tools and a separate Eve operator package.

These facts describe code, not verified live operation. The source snapshot is limited metadata from mutable branches. It is not a completed live indexing run, a mirror of paid files or thousands of usable previews.

## Implemented by this repair

- Shared React shell at `/browse/assets`, reusing the existing animated/collapsible sidebar, top bar, original website categories, account controls and theme.
- All assets navigation in the original sidebar; explicit Websites / Assets distinction.
- Search/filter/detail/pagination URL state, API-backed asset cards, source browser, existing saved-asset storage and acquisition instructions.
- Explicit service errors versus empty results; honest missing-preview states.
- Local API proxy with narrow development-origin support.
- Visitor redirects from the separate registry browser; legacy curator and MCP utility pages remain.
- User guide, setup/deployment notes, decisions and changelog entries.
- Revision-checked account persistence for website lists and asset favourites, including guest migration, conflict replay and retry UI.
- Source-pinned shadcn/ui renders for Alert, Card, Input, Skeleton and Spinner, with immutable source integrity checks and explicit illustration fallbacks.

## Tested after integration with main

- All 158 application tests pass across 17 files.
- All 23 registry core/API/Eve-client tests pass.
- The official MCP client integration test passes.
- Repository typecheck, lint and production build pass on Node 22.
- The protected Vercel preview reports Postgres storage, 67 published assets and 3 approved providers.
- URL-backed asset search, detail loading and licence-aware acquisition guidance pass in the browser.
- Scoped scout intake, curator status/queue access and worker job access pass against Neon; the disposable scout record was removed afterward.
- The deployed MCP endpoint negotiates protocol `2025-06-18` and exposes all six UIXO tools.
- Live provider indexing and Eve remain separate release gates.
- Desktop and narrow-viewport browser review confirms the source-rendered Alert remains proportional in gallery and detail views with no horizontal overflow.
- The local registry accepts both documented development origins (`127.0.0.1:3000` and `localhost:3000`), restoring acquisition details behind Vite's proxy.

## Deployment evidence and blockers

The `codex/integrate-pr-20` branch includes the latest `main` and deploys successfully. Its branch-scoped Vercel preview variables point at the existing Neon database, where the additive `uixo_v2_*` migration and 67-record seed were applied. Preview and production currently share that Neon database, so the tables are namespace-isolated rather than branch-isolated. Production Vercel does not yet have the `UIXO_*` runtime variables and still serves the existing site until this branch is merged and promoted.

## Remaining release work, in order

1. Add ordinary PR CI, separate preview data from production and complete signed-in role/save acceptance; then review and merge the integration branch and promote a verified production deployment.
2. Finish shared-shell curator integration and validate indexing retries/continuations and publication transitions.
3. Connect the real Grok bot to the verified scout credential, then prove discovery → staging → indexing → review → publication.
4. Deploy and exercise Eve with bounded credentials, model/tool limits and one real job. Schedules, maintenance and model-assisted analysis are not demonstrated by configuration alone.
5. Generate and review a materially larger real catalogue. Expand beyond components and icons to the supported resource categories; do not invent records to meet a target count.
6. Expand the reviewed source-pinned preview set beyond the five representative components; keep every unsupported record labelled as an illustration.
7. Run responsive browser acceptance on mobile and complete a real-client MCP acquisition journey. Compatibility metadata is not runtime certification; install instructions are not a project-aware installer.
8. Add semantic/visual retrieval and project-aware design/install workflows only as separately tested increments. Current search is weighted keyword search.
