# UIXO v2 status

## Current outcome

The entire v2 brief is **not complete**. The branch remains a draft review, not a production-ready release. The latest repair integrates visitor asset discovery into the original React shell and supplies the missing setup/user documentation.

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

## Tested after integration with main

- All 136 existing application tests pass.
- All 23 registry core/API/Eve-client tests pass.
- The official MCP client integration test passes.
- Repository typecheck, lint and production build pass on Node 22.
- Browser acceptance and live provider/indexing calls remain separate release gates.

## Deployment evidence and blockers

The branch has been integrated with the latest `main` locally and the full build succeeds. Vercel currently has none of the required `UIXO_*` registry variables, so a deployment will start in read-only snapshot mode. Persistent registry migration, seeding, browser QA and hosted acceptance remain outstanding. No production registry database changes were performed.

## Remaining release work, in order

1. Inspect the integrated screens on desktop/mobile. Verify the actual branch preview, API startup, migrations, seed data and function data-file access.
2. Generate and review a materially larger real catalogue. Expand beyond components and icons to the supported resource categories; do not invent records to meet a target count.
3. Capture useful real component previews, with appropriate source permission and isolation. Generic cards are not a substitute for visual QA.
4. Finish shared-shell curator integration and validate sign-in, JWT claims, permissions, indexing retries/continuations and publication transitions against a persistent preview database.
5. Connect the real Grok bot to scoped intake, then prove discovery → staging → indexing → review → publication.
6. Deploy and exercise Eve with bounded credentials, model/tool limits and a real job. Schedules, maintenance and model-assisted analysis are not demonstrated by configuration alone.
7. Verify remote MCP with a real client and a complete acquisition journey. Compatibility metadata is not runtime certification; install instructions are not a project-aware installer.
8. Add semantic/visual retrieval and project-aware design/install workflows only as separately tested increments. Current search is weighted keyword search.
