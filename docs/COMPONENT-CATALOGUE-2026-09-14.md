# Component catalogue and icon-pack update

## Implemented

- Seven additional shadcn components, using original demos at commit `2b3e6d4f8d9161fe5c19340dc383aade392012dd`: switch, table, tabs, textarea, toggle, toggle-group, tooltip.
- 174 component entries: 53 shadcn, 68 Magic UI, 33 Motion Primitives, and 20 Simply Buttons. Simply Buttons is pinned to `d76ed2a67cc2fc7fbfa14d62d0704668d20e415d`; its original React previews and CSS are retained without rewriting them.
- 364 retained upstream files, checked against SHA256 source locks. Existing original licences remain included. New demos use the same sandboxed, viewport-mounted live renderer.
- Two icon packs, Lucide and Heroicons. Pack cards link to the official library and offer a React package variant in details. No invented pack artwork and no thousands-of-glyph import.
- Legacy individual icon rows are retained for saved lists and detail links. They are excluded from normal catalogue search and public counts. Old `kind=icon` filter URLs resolve to packs.
- Twelve component categories in the sidebar and Refine controls. Category, search, source, pricing and framework combine before pagination. URLs preserve category state; HTTP and MCP support it too.
- Provider indexers no longer assert that an uncaptured component has a screenshot. Live-only entries retain their original demo in the local source manifest; captured previews are attached only when the capture manifest contains the asset.
- Shared footer changes from the preceding request are included.

## Verification

- 173 UI tests pass; 30 registry/service/HTTP tests pass; MCP integration passes.
- Full production build passes, including preview coverage, source integrity, TypeScript and prerendering.
- Browser: category-filtered forms render, sidebar expands with component subcategories, switching to icon packs returns two listings, original source links and shared footer render.
- All seven new demos report ready in sandboxed browser frames. Direct Switch interaction changes checked state; Tabs changes the selected panel. This is not a claim that every interaction in all 174 demos was retested.
- All 20 Simply Buttons demos report ready in sandboxed browser frames; Like Burst changes from Like to Unlike when clicked. Browser testing caught and fixed a provider-base-URL issue so lazy CSS loads from UIXO, preserving the original styles.

## Release

Published on 14 September 2026 at https://uixo-brown.vercel.app. Main code commit: `cb4db0b`; Vercel production deployment `dpl_2mpSbcJp4RaJ9b5igJHoLqwgRPFR` is READY.

The existing Neon catalogue sync inserted 29 records and updated 147, with zero removals. Public API verification returns 174 components, two icon packs, six providers, and 20 Simply Buttons results with both source/category filtering and keyword search. Production browser checks confirm subcategory navigation, including returning from the guide to Buttons & actions. The deployment error-log query returned no matching logs.

Future releases should deploy the API/UI and run the explicit `registry:sync` operation against the intended database. This updates reviewed classifications without deleting legacy glyphs. Do not run a broad icon crawl. The local preview uses an isolated in-memory registry.

## Simply Buttons source terms

The retained README explicitly describes copying and adapting gallery examples, but declares no standard licence or specific commercial/redistribution terms. Those permissions remain `unknown`; acquisition links to the original gallery. The gallery is a reviewed snapshot adapter: future ingestion must add matching original demos and verify them before publication. It cannot silently crawl and publish unreviewed entries.

## Future ingestion rule

Add a reviewed component source, original runnable demo, immutable source reference, licence and acquisition metadata together. Verify the real demo before publishing. Pick a component category and check combined search. Add icon libraries as packs that link out; do not add individual glyphs. Further providers need their own source, acquisition and sandbox review.
