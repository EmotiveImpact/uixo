# UIXO implementation decisions

## 2026-09-12: integrate discovery, do not replace UIXO

**Problem:** PR #20 added a separate static browser under `public/registry`. It did not use `src/components/AppSidebar.tsx`, `TopBar.tsx`, the shared theme, or the original category/navigation experience. The user explicitly preferred the previous layout.

**Decision:** retain the registry/API backend and load a React asset workspace at `/browse/assets`. Reuse the original shell components, account UI, page heading and theme. Add an additive All assets entry to the existing sidebar. Keep `/` as the sidebar-free landing page and `/browse` as the website catalogue.

**Trade-off:** curator and MCP utility pages remain in the old static application temporarily. Visitor routes redirect into the integrated shell. This is explicit partial migration, not a full rewrite or claim that every page is unified.

## Keep source and asset counts distinct

Website categories and candidate source counts are not counts of usable asset files. Keep the website taxonomy visible, label it as website categories in asset mode, and query individual asset results from the registry. Do not publish scout candidates merely to fill a category or show fabricated asset totals.

## Do not mask an unavailable registry

A successful HTML page can coexist with a failed function, a missing migration or an unseeded remote database. The client must reject non-JSON API responses, display service failures separately from empty results, and expose a status check. Provider/status metadata failure must not automatically discard an otherwise successful asset search.

## Preserve data and production safety

Keep the existing `uixo.asset-saves.v2` storage contract, the server-side licence/acquisition decisions and original website routes. Do not execute generated install instructions or relax production origin checks. The registry uses additive `uixo_v2_*` tables, and preview credentials are scoped to the integration branch.

## Local development integration

Run Vite on explicit loopback port 3000 and the existing registry server on 4175. Proxy only registry/MCP routes. Allow that exact browser origin on the local-only registry server. Do not use a wildcard origin.

## Verification language

Separate implementation, tests and deployment evidence. Record local tests, hosted API checks, browser acceptance and remaining live-provider work independently so a successful build is never presented as proof of a complete indexing workflow.
