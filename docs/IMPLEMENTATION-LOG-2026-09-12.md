# UIXO implementation log — 12 September 2026

This log records the concrete work performed while completing the prioritised product audit. It is evidence for the roadmap gates, not a replacement for commit history or deployment logs.

## SAVE-01 and SAVE-02 — reliable account favourites

### Repository and design review

- Rechecked the active integration branch, recent commits and repository instructions before editing.
- Read the Vercel React best-practices skill because the work changes shared React state and multiple components.
- Traced website favourites from `useLists` through `/api/lists` and `user_lists`.
- Traced asset favourites from `AssetLibrary` and `AppSidebar` to the browser-only `uixo.asset-saves.v2` key.
- Confirmed the destructive website failure path: a failed initial GET set the old hook to “synced”, allowing a later full snapshot PUT without a known server baseline.
- Confirmed asset favourites had no account API, owner boundary, conflict handling or guest migration.

### Data model and Neon migration

- Added an optimistic `revision` to website-list snapshots.
- Added the typed `user_asset_saves` table with `user_id`, JSON asset IDs, revision and update timestamp.
- Kept website resources and registry assets in separate typed storage so provider, website and asset IDs cannot be confused.
- Added the additive, repeatable migration `db/migrations/003-account-saves.sql`.
- Updated `db/schema.sql` for new installations and added an explicit `ALTER TABLE` for existing installations.
- Applied the migration to the existing Vercel preview branch’s Neon database.
- Verified schema metadata only: `user_lists.revision` is `bigint`; `user_asset_saves.asset_ids` is `jsonb`; `user_asset_saves.revision` is `bigint`. No user rows were read.

### Server API

- Changed `GET /api/lists` to return `{ lists, revision }`.
- Changed `PUT /api/lists` to require the expected revision.
- Added conditional writes that return HTTP 409 with the latest account snapshot when another device wrote first.
- Added authenticated `GET /api/saved-assets` and revision-checked `PUT /api/saved-assets`.
- Validated asset IDs and retained only assets present in the canonical `uixo_v2_assets` registry.
- Added the saved-assets endpoint to the local Vite API runner.
- Preserved Neon Auth verification and the existing `users` foreign-key boundary.

### React state and UI

- Added a reusable account snapshot state machine that never writes before loading the remote baseline.
- Kept local mutations queued through failed reads and writes.
- Serialised writes so rapid interactions cannot complete out of order and restore an older snapshot.
- Rebased queued add/remove operations over HTTP 409 snapshots and retried against the new revision.
- Preserved guest saves and merged them only into the first signed-in account or the same account’s cache.
- Prevented cached data owned by another account from being imported.
- Cleared account-owned browser snapshots on sign-out so private favourites are not left visible to a guest.
- Replaced duplicate asset-save hook instances with one state owner per application shell; sidebar, cards and details receive that shared state.
- Kept same-tab and cross-tab asset-save updates aligned.
- Added quiet, actionable website/asset sync notices that render only after a failure and provide `Retry sync`.
- Updated the asset save message to distinguish browser-only guest saves from account syncing.

### Tests and verification

- Added website-list tests for failed initial reads, guest migration, optimistic conflicts, removals and failed-write retry.
- Added asset-save tests for guest migration, account isolation, sign-out cleanup and cross-device conflict replay.
- Added typed asset-ID validation, deduplication, size-limit, merge and equality tests.
- Focused save suite: 13 tests passed.
- Full application suite: 151 tests passed across 16 files.
- TypeScript typecheck passed.
- ESLint passed, including React hook, ref and purity rules.
- Prettier check was used to identify and format every changed TypeScript file.
- The first sandboxed full build reached registry verification but the sandbox blocked its temporary localhost listener with `EPERM`; no product assertion failed.
- The full build was rerun with localhost permission: all 23 registry tests, the real MCP client test, Vite production build and prerender of 23 pages passed.

### Files changed

- `api/_lib/user-asset-saves.ts`
- `api/_lib/user-lists.ts`
- `api/lists.ts`
- `api/saved-assets.ts`
- `db/migrations/003-account-saves.sql`
- `db/schema.sql`
- `src/App.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/AssetLibrary.tsx`
- `src/components/AssetWorkspace.tsx`
- `src/components/SaveSyncNotice.tsx`
- `src/hooks/useAccountSnapshot.ts`
- `src/hooks/useAssetSaves.test.ts`
- `src/hooks/useAssetSaves.ts`
- `src/hooks/useLists.test.ts`
- `src/hooks/useLists.ts`
- `src/lib/api.ts`
- `src/lib/asset-library.ts`
- `src/lib/asset-saves.test.ts`
- `src/lib/asset-saves.ts`
- `src/lib/lists.ts`
- `src/styles.css`
- `vite.config.ts`

### Deployment evidence

- Committed the first complete save package as `13246e0` (`Sync favourites safely across accounts`).
- Pushed that commit to both `codex/integrate-pr-20` and `astra/uixo-v2-design-intelligence`.
- Waited for Vercel deployment `dpl_87YhQLGqE5GEchbsFiDoH8cKC1Ga`; it reached Ready and updated the established Astra preview alias.
- Verified `/browse/assets` returned HTTP 200 and `/api/registry?action=status` returned HTTP 200 with persistent Postgres storage, 67 assets and three providers.
- The first live call to `/api/saved-assets` returned a function invocation error instead of the expected unauthenticated 401. A comparison call showed `/api/lists` had the same deployment-only failure.
- Read the Vercel function logs and found native ESM could not resolve the extensionless shared import from `src/lib/asset-saves.js` to `src/lib/storage`.
- Added explicit `.js` specifiers to the server-shared imports in `src/lib/asset-saves.ts` and `src/lib/lists.ts` so Vercel’s emitted ESM resolves them at runtime.
- Reran typecheck, lint, formatting, the focused save suite and the full production build after the packaging fix; all passed.
- Committed the ESM correction as `082fde5` (`Fix Vercel ESM resolution for save APIs`) and pushed it to both integration branches.
- Waited for corrected Vercel deployment `dpl_9miyH6wyMHM9y2krXVze3JcWwbSw`; it reached Ready at `https://uixo-2qtm3fl1g-emotiveimpact-gmailcoms-projects.vercel.app` and updated the established Astra preview alias.
- Rechecked the protected preview through `vercel curl`: `/api/lists` and `/api/saved-assets` now return the expected unauthenticated HTTP 401 JSON; `/api/registry?action=status` returns HTTP 200 with Postgres storage, writes enabled, 67 assets and three providers; `/browse/assets` returns HTTP 200.
- Browser acceptance confirmed the guest saved view renders three existing assets, the sidebar labels and routes Website and Asset favourites separately, and the browser console has no warnings or errors. No save was added or removed during this check.

### Google sign-in correction and remaining acceptance boundary

- Reproduced the Google sign-in failure and captured the exact API response: HTTP 403 `INVALID_CALLBACKURL`.
- Inspected Neon Auth configuration and found the stable Astra Vercel preview alias was absent from Trusted Domains.
- Added `https://uixo-git-astra-uixo-v2-7f109e-emotiveimpact-gmailcoms-projects.vercel.app` to Neon Auth Trusted Domains.
- Retried Google sign-in and reached Google's account chooser, proving the callback-domain rejection is fixed.
- Stopped before choosing an account. Selecting one would submit the user's identity to Google/Neon, so the signed-in cross-device browser acceptance remains pending an explicit account choice. The server state machine, role boundary and cross-device conflict behaviour are covered by tests.

## MEDIA-01 — source-pinned component previews

### Source acquisition and review

- Confirmed all 46 captured component records were created from mutable `main` metadata and deliberately have their variant source references cleared by `registry/bootstrap.ts`.
- Selected five representative shadcn/ui primitives for the first reviewed renderer: Alert, Card, Input, Skeleton and Spinner. They cover feedback, structured content, form and loading states without importing interactive overlay code.
- Queried the official shadcn/ui repository and pinned commit `2b3e6d4f8d9161fe5c19340dc383aade392012dd`.
- Two initial raw-source command attempts failed before changing the repository: unquoted query strings were treated as shell globs, then the sandbox denied GitHub network access.
- Retried the quoted GitHub API request with the required network permission and fetched eight candidate source files for inspection.
- Chose the five primitives above after checking every import. Alert needed the small `class-variance-authority` package; the other selected primitives use UIXO's existing React, `cn` and Lucide dependencies. Badge, Button and Separator were left as illustrations because their current upstream files add Radix runtime dependencies.
- Fetched and retained the MIT licence from the same immutable commit.
- The first sandboxed package-lock update waited without producing a change; the permitted retry completed and added `class-variance-authority` as a direct locked dependency.

### Renderer and catalogue changes

- Added the five upstream primitive files under `src/components/previews/shadcn`. Their only source change is the `cn` import path to UIXO's equivalent helper.
- Added an immutable source map and a strict provider/slug allow-list. UIXO never fetches or executes component source while a visitor browses.
- Added deterministic preview compositions and matching theme tokens for card, primary, accent, input and destructive colours in light and dark modes.
- Updated `AssetPreview` to use the source renderer only for allow-listed shadcn records and to show `Pinned source render · shadcn/ui 2b3e6d4`. Every other component keeps `Illustration · not an upstream render`.
- Changed catalogue card markup so the title link provides the full-card click target. Preview form controls are no longer descendants of a link; the independent save button remains above the link overlay.
- Added a build-time integrity script that restores the one allowed import substitution in memory and compares SHA-256 hashes for all five sources and the retained licence. A source edit now fails `npm run previews:verify` until it is deliberately reviewed and repinned.
- Added the preview source directory to the vendored-source formatting/lint boundary so automated formatting cannot silently rewrite upstream code.
- One combined CSS patch initially missed the more specific save-button selector and applied no changes. The changes were split into verified patches and then applied successfully.

### Tests and browser acceptance

- Added tests for all five real renderer roots, the exact immutable source URL and rejection of unsupported components/providers.
- The first focused test run exposed two test-only mistakes: the upstream Spinner root has a status role rather than a `data-slot`, and this Vitest setup does not install the DOM matcher `toBeEmptyDOMElement`. The assertions were corrected; product code was unchanged by those failures.
- `npm run previews:verify` passes for five source files and the retained licence.
- TypeScript, ESLint and Prettier checks pass.
- The full application suite passes: 158 tests across 17 files.
- The complete production build passes: 23 registry tests, the official MCP-client integration test, source-integrity verification, TypeScript compilation, the Vite bundle and prerendering of 23 pages plus sitemap and robots metadata.
- Started the local registry and Vite services for visual review. The first registry start was blocked by the sandbox's localhost policy; the permitted retry started successfully.
- Desktop review confirmed Alert and Card render their actual retained primitives in the three-column gallery, alongside explicit illustration labels for unsupported components.
- Narrow-viewport review confirmed a one-column grid, proportional scaling and no document horizontal overflow. The detail dialog measured 542 CSS pixels inside a 582-pixel viewport; its preview and 320-pixel source canvas remained contained.
- Opening Alert details exposed a pre-existing local development-origin mismatch: Vite runs on port 3000 but `registry-dev.ts` still allowed port 5173. Updated the local allow-list to accept only `127.0.0.1:3000` and `localhost:3000`, restarted the service and verified acquisition guidance loads instead of `Cross-origin requests are not allowed`.
- No remote source code was executed and no visitor save state was changed during visual acceptance.

### Files changed

- `.prettierignore`
- `eslint.config.js`
- `package.json`
- `package-lock.json`
- `scripts/verify-pinned-previews.mjs`
- `src/components/AssetLibrary.tsx`
- `src/components/AssetPreview.tsx`
- `src/components/asset-library.css`
- `src/components/previews/PinnedComponentPreview.tsx`
- `src/components/previews/PinnedComponentPreview.test.tsx`
- `src/components/previews/pinned-component-sources.ts`
- `src/components/previews/shadcn/alert.tsx`
- `src/components/previews/shadcn/card.tsx`
- `src/components/previews/shadcn/input.tsx`
- `src/components/previews/shadcn/skeleton.tsx`
- `src/components/previews/shadcn/spinner.tsx`
- `src/components/previews/shadcn/LICENSE.md`
- `src/components/previews/shadcn/README.md`
- `src/styles.css`
- `tools/registry-dev.ts`
- `docs/UIXO-USER-GUIDE.md`
- `docs/UI-PARITY.md`
- `docs/STATUS.md`
- `docs/PRODUCT-AUDIT-2026-09-12.md`
- `docs/PRODUCT-ROADMAP.md`
- `docs/IMPLEMENTATION-LOG-2026-09-12.md`

## OPS-01 — CI and release isolation/auth checks

### Ordinary CI and repository hygiene

- Added `.github/workflows/ci.yml` for every pull request and pushes to `main`, `astra/**` and `codex/**`, with read-only repository permissions, per-ref cancellation and a 15-minute bound.
- The workflow uses Node 22, caches from both lockfiles, installs the application with `npm ci`, then checks formatting, lint, all application tests and the complete production build.
- Changed `registry:deps` from `npm install` to `npm ci` so the nested registry dependency graph is locked in local builds and GitHub Actions.
- Added `.uixo/` to `.gitignore` after a local registry command created disposable `registry.sqlite` state in the worktree. The file was removed before commit.
- The first worktree formatting attempt failed because this isolated checkout intentionally had no `node_modules`. A temporary symlink to the existing workspace install was used for verification and will be removed before commit.
- Formatting, ESLint and all 158 application tests passed.
- The first complete build reached the registry HTTP suite and then failed because the filesystem sandbox denied five tests permission to bind `127.0.0.1`. This is the same environment restriction seen in the previous package, not a product assertion failure; the build is rerun with localhost permission below.
- The permitted CI-equivalent rerun passed: formatting, ESLint, all 158 application tests, all 23 registry tests, the official MCP-client test, five source-preview integrity checks, TypeScript, the Vite production bundle and prerendering of 23 pages plus sitemap and robots metadata.

### Preview database isolation

- Audited Vercel environment scope. General Neon variables were shared across Production, Preview and Development, while the existing `UIXO_*` variables were limited to the two integration preview branches. Production had no UIXO registry variables.
- Created the permanent schema-only Neon branch `uixo-preview` (`br-calm-sound-augbhfde`) from main with automatic deletion disabled. It contains schema but no copied production rows.
- Added branch-scoped `UIXO_DATABASE_URL` entries for `astra/uixo-v2-design-intelligence` and `codex/integrate-pr-20` in Vercel. A subsequent CLI pull showed both entries were present but empty, so they are not treated as complete or working configuration.
- Migrated and seeded the preview registry while using the actual preview connection directly: migration completed and the captured reviewed snapshot inserted 67 assets from 67 source assets.
- Preview Neon Auth could not provision because the schema-only branch copied the empty `neon_auth` table definitions without the Neon Auth service configuration. Neon reported that the existing schema must be removed before provisioning.
- A first guarded cleanup attempt failed before connecting because the isolated worktree could not resolve `@neondatabase/serverless`; no database change occurred.
- A second attempt pulled the branch environment successfully but found the branch-scoped `UIXO_DATABASE_URL` value empty; it stopped before connecting and made no database change. The temporary environment file contains secrets and is removed during cleanup.
- The remaining infrastructure action is tightly bounded: verify every copied `neon_auth` table is empty, drop only that empty schema, enable Auth on `uixo-preview`, restore account-save foreign keys, and replace both empty branch-scoped Vercel values. Production data and production Auth stay unchanged.

### Release configuration findings

- Pull request 20 is still an open draft from `astra/uixo-v2-design-intelligence` to `main` with a clean merge state. Before this package it had a successful Vercel check but no ordinary application/registry CI job.
- Scoped service-token role tests already prove curator, scout and worker allow/deny boundaries in the repository suite. Human curator JWT verification fails closed unless exact issuer, audience, Auth base URL and database values are configured.
- Added an explicit environment-boundary guide, Auth claim rule, hosted acceptance matrix and production release/rollback runbook to `docs/UIXO-SETUP.md`.
- No merge or production promotion has been performed. OPS-01 remains incomplete until the preview connection is corrected, Neon Auth is provisioned, a deliberate preview account completes signed-in acceptance and the new GitHub CI run is green.
