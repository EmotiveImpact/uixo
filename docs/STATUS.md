# UIXO v2 status

For product editions and delivery phases, see the [master roadmap](PRODUCT-ROADMAP.md). For the later UI and favourites repairs and current engineering priorities, see the [12 September audit](PRODUCT-AUDIT-2026-09-12.md). The integration-repair sections below retain their original verification context.

## Current outcome

The entire v2 brief is **not complete**. The integration branch has reliable account favourites, five source-pinned component renders and visitor asset discovery connected to a persistent Neon registry on its protected Vercel preview. CI/release isolation, Eve, the production registry configuration and a larger live-indexed catalogue remain separate release work.

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
