# Phase 1 hardening and live readiness

19 September 2026. Builds on merged Discovery V2 PR #36 (`00f936f71379`).
Phase 1 remains open until the production gates in [the release ledger](PHASE-1-RELEASE.md) pass.

## Source discovery above the reporting cap

Issue #38 exposed a public availability defect: `source-directory` reused the private coverage
scan and failed above 10,000 published assets. Public source browsing now has its own read path.
The private curator report retains its existing cap and permissions.

`GET /api/registry?action=source-directory` accepts `q` (at most 120 characters), `limit`
(1 to 48, default 24) and `offset`. It returns `items`, `total`, `offset`, `limit`, `nextOffset`
and `generatedAt`. Search operates across the approved provider set, not just the loaded page.
The Sources interface requests 12 providers per page and keeps search available during reloads. Requests wait for a 180 ms typing pause; superseded
queries and unmounted screens cancel their pending timer before server work starts.

Each public source summary has an exact SQL `assetCount`. Evidence is either complete for that
source or explicitly deferred: `metrics: null`, `evidenceStatus: deferred` and an explanatory
`evidenceNote`. Null is not zero coverage. Framework, licence and verification display fields
are not assessed when the detailed report is deferred; individual assets remain inspectable.

The evidence budget is at most 2,000 asset payloads per request and 1,000 per source. Selection
uses at most three database reads, with at most 2,001 asset rows returned to detect concurrent
changes. Exact counts and search still require indexed SQL work proportional to matching data;
this is not a claim of constant-time queries or a production load benchmark. Large providers
remain browsable rather than being silently sampled. Count changes or corrupt legacy evidence
cannot turn a partial scan into a complete report.

`source-health` and MCP `get_source_health` use the same public summary contract. Machine clients
must handle nullable metrics and use `assetCount` for inventory. MCP server version is 0.3.1;
the nine tool names and publication permissions remain unchanged.

## Verification

Local checks passed: 199 application tests in 28 files, 62 registry/API/Eve tests, the official
nine-tool MCP integration, TypeScript and ESLint. Scale regression tests cover a 10,001-asset
provider, several large providers, revoked providers, server pagination, search beyond page one,
literal wildcard input, the shared evidence budget and unchanged private-route denial. UI tests
cover deferred evidence, navigation, pagination, loading and service errors. Full build/browser
CI must be checked on the actual PR head before merge.

## Live public observation, not production activation

Read-only GitHub Actions run `35464187915`, at 19:23 UTC on 19 September 2026, inspected the
existing public origin `https://uixo-brown.vercel.app` without credentials or mutations.

- Status returned HTTP 200, release `discovery-v2`, build `00f936f71379`, PostgreSQL storage and
  `readOnly: false`; published counts were 264 assets and six providers.
- `intelligence.ready` was **false** for migration `004-intelligence`.
- Sources returned HTTP 200 with six providers. Collections returned **HTTP 503**.

This confirms that the current visible release is deployed but its persistent intelligence
schema is not ready. It does not prove that only one table is absent, that real curator sign-in
works, or that the remaining release gates pass.

The Vercel connection still returns 403 for the actual `emotiveimpact-gmailcoms-projects` team.
Neon database access has not been established. No production migration, backup, collection
publication, role change, scout activation or hosted Eve run was performed in this pass.
Restore the authorised service connections, then use the explicit migration and publication
procedure in the release ledger. Do not fix a missing schema by silently substituting evaluation
collections, auto-migrating public requests or weakening authentication.
