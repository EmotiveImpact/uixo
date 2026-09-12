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

## Tested in this repair

- 16 native client-contract tests passed with Node 22.16.0: route round-tripping, invalid input, saved-state migration, unsafe link rejection, empty versus malformed responses, API HTML/503 errors, cancellation and acquisition request semantics.
- TypeScript syntactic transpilation of the changed TS/TSX sources produced no syntax diagnostics.
- These are **not** full React browser tests, a complete repository typecheck, lint/format certification or an MCP interoperability test.

The previous PR reports 23 native core/API/Eve-client checks and 16 offline browser checks. They were not rerun as part of this repair and must not be added to the above results to imply a full green suite.

## Deployment evidence and blockers

Vercel's GitHub status for the inspected pre-repair commit reported success. The Vercel connector returned 403 for the actual project team, preventing deployment/runtime inspection. That connector failure does not itself diagnose the site's blank assets.

The terminal environment could execute local tests but could not resolve external package/repository hosts. It did not contain the installed UIXO React application dependencies. Full build, complete app browser QA and hosted acceptance remain outstanding. No production database changes or main merge were performed.

## Remaining release work, in order

1. Run the complete application checks and inspect the integrated screens on desktop/mobile. Verify the actual branch preview, API startup, migrations, seed data and function data-file access.
2. Generate and review a materially larger real catalogue. Expand beyond components and icons to the supported resource categories; do not invent records to meet a target count.
3. Capture useful real component previews, with appropriate source permission and isolation. Generic cards are not a substitute for visual QA.
4. Finish shared-shell curator integration and validate sign-in, JWT claims, permissions, indexing retries/continuations and publication transitions against a persistent preview database.
5. Connect the real Grok bot to scoped intake, then prove discovery → staging → indexing → review → publication.
6. Deploy and exercise Eve with bounded credentials, model/tool limits and a real job. Schedules, maintenance and model-assisted analysis are not demonstrated by configuration alone.
7. Verify remote MCP with a real client and a complete acquisition journey. Compatibility metadata is not runtime certification; install instructions are not a project-aware installer.
8. Add semantic/visual retrieval and project-aware design/install workflows only as separately tested increments. Current search is weighted keyword search.
