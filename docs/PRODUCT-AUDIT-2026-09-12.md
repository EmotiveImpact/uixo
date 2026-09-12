# UIXO product direction and remaining work

For the full application/edition scope, intelligence capabilities and release gates, see the [master product roadmap](PRODUCT-ROADMAP.md). This audit is its engineering companion, not the complete product scope.

Reviewed 12 September 2026 against the integration branch. This is a scoped code-and-conversation audit, not proof that every production journey has passed.

## Conversation coverage

The connected ChatGPT project `UI-XO` returned these four conversations. Their available text histories were read through the last page:

- [UIXO vs UIOX Comparison](https://chatgpt.com/c/6aa4e871-aefc-83eb-b288-8f5d24c97ac5)
- [Define UIXO Business Model](https://chatgpt.com/c/6aa4ead5-f83c-83eb-924e-02fcf90e54bd)
- [Build UIXO Asset MCP](https://chatgpt.com/c/6aa4ce7e-bbc0-83eb-a538-fc2c93faaf1e)
- [Design UIXO Logo Concepts](https://chatgpt.com/c/6aa27fea-db5c-83eb-8913-4481246a3ad3)

The logo history includes image turns that the text reader does not reproduce. The text preferences are recoverable; this is not a visual approval of a particular generated mark. No additional project conversations appeared in the available listing; that is not a guarantee that an unavailable or archived conversation does not exist.

## Direction to preserve

UIXO is evolving into an interface/design asset registry for humans and coding agents. Web, API and MCP are interfaces to that shared knowledge. The useful unit is a sourced asset with previews, variants, licence evidence and an acquisition route, not merely a website link.

Keep the existing Grok scout and its GitHub issue intake. Eve is an optional worker/orchestration layer for investigation and maintenance; it must not become a dependency for ordinary browsing. Approvals, evidence and durable job state belong in UIXO.

Preserve the restrained UI, three-column maximum, borderless treatment, persistent sidebar and current navigation order: catalogue menu → heading → view/sort controls → search/pricing → results. Later branding discussion favours UIXO as the wordmark and an XO-derived companion mark. The current collapsed U is not that final identity.

The business discussion proposes mostly free discovery, paid advanced workflows, teams and API usage, and possibly enterprise governance later. Its dollar figures and market comparisons were exploratory, not approved pricing or validated demand. Do not publish those tiers as settled commitments. Do not let sponsorship determine editorial ranking.

## Favourites: immediate repair and intended destination

The defect was structural: `AssetWorkspace` supplied the website list callback to the shared sidebar, while `AssetLibrary` kept asset saves under a different localStorage key. Clicking Favourites therefore opened the website list.

Implemented in this change:

- One Favourites sidebar section with clearly labelled Websites and Assets destinations and separate counts.
- Asset favourites opens `/browse/assets?view=saved` and clears unrelated filters so saved items are not hidden.
- The appropriate destination is highlighted; custom website lists remain under Your lists.
- One shared hook broadcasts asset save changes to cards, sidebar and other tabs.
- Existing website lists and asset storage are preserved.

This is unified navigation, not unified cloud persistence. Asset favourites still live in the browser. A future combined All view should use explicit Website/Asset labels and retain source/framework information. Build that on a typed saved-item model rather than pretending a provider and one of its icons are the same record.

## Prioritised work register

| Priority | Gap or defect                                        | Evidence / current state                                                                                                                                                | Completion condition                                                                                                                                       |
| -------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Asset saves do not sync to accounts                  | `AssetLibrary`/`useAssetSaves` use localStorage; `api/_lib/user-lists.ts` accepts only known website resource IDs                                                       | Typed website/asset saved items, owner-scoped API, guest migration, cross-device save/remove tests; retain existing saves                                  |
| P0       | Website save failure handling can lose updates       | `useLists.ts` sets synced=true after GET retries fail; subsequent whole-list PUT can overwrite a remote snapshot never loaded; PUT failures have no visible retry state | Do not enable snapshot writes until baseline is loaded, preserve pending changes, show error/retry and reconcile concurrent edits                          |
| P0       | Real component previews missing                      | `AssetPreview.tsx` renders illustrative HTML for components; original SVG previews exist for icons                                                                      | Source-pinned real renders with isolated execution, visual review and reproducible thumbnail generation; honest fallback                                   |
| P0       | Release configuration and auth acceptance incomplete | Prior preview verification passed Neon and scoped service tokens; signed-in registry curator JWT flow not fully accepted; production variables were previously absent   | Recheck current production config, prove allowed/denied roles, then approve merge/promotion; no blind merge                                                |
| P0       | Preview/production data isolation                    | Setup notes record shared Neon database with namespace-isolated registry tables                                                                                         | Dedicated preview branch/database or documented isolation and migration/recovery procedure                                                                 |
| P1       | Catalogue too small and types misleading             | Captured index has 67 assets across three providers; supported filters include categories with no inventory                                                             | Complete a real approved-provider indexing run, review/publish useful records; expose counts/availability instead of dead-end promises                     |
| P1       | Grok-to-registry handoff unproven                    | User reports Grok publishes GitHub issues; scout endpoint exists; repo workflow does not consume those issues                                                           | Structured issue → deduplicated candidate → investigation → review → publication with visible failure/retry state                                          |
| P1       | Eve is scaffolded, not an accepted live workflow     | Separate agent, authenticated channel and queue tools exist; no demonstrated deployment/run                                                                             | One bounded authenticated job, model/tool budget, retry/cancellation, review boundary and audit trail; then consider schedules                             |
| P1       | Indexing/review/publication acceptance               | Code and tests exist for jobs, continuations and review; full remote run not demonstrated                                                                               | Run staging, reject/approve, continuation/retry and publication against a real source; verify search receives published revision                           |
| P1       | Preview freshness/provenance                         | Captured metadata references mutable source branches; dates alone do not prove runtime compatibility                                                                    | Commit/version pins, observed-at dates, refresh queue, changed licence/source handling and stale badges                                                    |
| P1       | Real-client MCP workflow                             | Six tools and protocol integration exist; `acquire_asset` returns a recipe, not an installer                                                                            | External coding client searches, inspects, chooses variant, resolves source and successfully uses one asset with retained notices                          |
| P1       | Compatibility remains mostly declared/unknown        | Registry explicitly avoids runtime certification; version evidence is limited                                                                                           | Better framework/version/peer-dependency evidence and sandbox verification where justified; keep unknown explicit                                          |
| P1       | Search beyond literal keywords                       | Shared registry ranking is weighted keyword matching, not semantic/visual retrieval                                                                                     | Intent-query evaluation set, aliases/use-cases/style metadata, ranking rationale; add embeddings only with measured improvement and hard filters preserved |
| P1       | Product flow consistency                             | Separate website and asset storage/routes still produce differences in saved states, formats and detail presentation                                                    | Acceptance matrix across websites/assets/collections/saves, sign-in, back/forward, keyboard, empty/error states and mobile                                 |
| P1       | Continuous integration does not cover normal changes | Only `registry-bootstrap.yml` found; push trigger is limited to its own workflow path, with manual dispatch                                                             | Ordinary PR/push checks install locked dependencies and run application, registry and MCP tests; report skipped review separately                          |
| P2       | Shared project collections                           | Editorial collections and user website lists exist, but mixed asset projects/team collections do not                                                                    | Distinguish curated collections from private projects; add typed membership and sharing permissions                                                        |
| P2       | Billing and API product controls                     | No billing/entitlement/metering implementation found in inspected API/registry/services                                                                                 | Validate first paid workflow and costs, then introduce limits, usage accounting, checkout and entitlement tests                                            |
| P2       | Brand implementation                                 | Text discussions favour UIXO + XO; exact final artwork not established from available text                                                                              | Select vector artwork, favicon and collapsed mark, test at 16–24px, retain hover-expand behaviour                                                          |
| P2       | Scale and operations                                 | Small catalogue and protected preview do not demonstrate production load/recovery                                                                                       | Query/index performance, cursor pagination at scale, object storage for previews/evidence, telemetry, backups and operational runbooks                     |

## What is already working and should not be rebuilt

- Shared React shell and legacy visitor redirects.
- Website, asset and collection navigation; collection text search.
- Search/filter URL state, pricing controls, three-column maximum with responsive fallback.
- Rich asset details with evidence, variants, acquisition instructions and compatibility responses.
- Proportional component illustrations (still not source renders), original icon SVGs.
- Sidebar hover-to-expand behaviour and light/dark support.
- Registry domain/service boundary, Neon adapter, three provider integrations and MCP surface.

## Delivery order

1. Finish saved-item persistence and the unsafe website sync failure path together.
2. Real component previews and a larger, freshly indexed approved catalogue.
3. Prove Grok intake, curator review, jobs and one Eve run end to end.
4. Prove external-client MCP use and production readiness; then merge/release.
5. Improve intent search, project collections and a validated paid workflow.

Brand and layout refinements can proceed alongside these increments, but must not be mistaken for completion of the registry and workflow product.
