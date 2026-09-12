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
- Final endpoint and signed-in browser acceptance will be added after the follow-up deployment is Ready.
