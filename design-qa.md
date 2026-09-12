# UILIST design verification

_Paths updated 2026-09-11: `mocks/` moved to `legacy/mocks/` when the pre-Vite prototype was archived._

Source: legacy/mocks/sleek-1.png (1487 × 1058).
Implementation: legacy/mocks/implemented-desktop.png, legacy/mocks/implemented-mobile.png.
Desktop viewport: 1487 × 1058 CSS pixels, 1x density. Mobile: 390 × 844.
State: dark theme, All websites, no search or pricing filter. Source and implementation viewed together in the same comparison input.

User-requested deviations: search and All/Free/Paid moved to the top navigation; expandable sidebar subcategories added. Existing six real resources retained instead of generated thumbnail content; counts reflect actual data. No account integration is implied.

Comparison history:

- Desktop typography and main-region sizing were too small. Increased desktop sidebar to 244px, main gutter to 40px, heading to 38px, card names to 17px and preview height to match selected image proportions.
- Some screenshot crops hid left-aligned content. Aligned Lucide and directory previews left; centered the centered hero previews.
- Mobile header wrapped awkwardly and the hidden sidebar was exposed during transition. Changed mobile header to an explicit grid and hid the closed drawer. Rechecked mobile screenshot and drawer opening.

Fidelity review:

- Typography: neutral Inter sans-serif, restrained weights, readable hierarchy; no oversized editorial hero.
- Layout: three-column desktop gallery, slim separated sidebar, grouped charcoal buttons, compact top search/filter controls. Single-column mobile with toggleable sidebar.
- Colour: near-black canvas, graphite active surfaces, muted gray labels and thin edges. Screenshot content supplies colour.
- Assets: actual locally saved source screenshots and locally bundled Lucide icon font. Preview contents differ from AI-generated source by design; actual sites are used.
- Content: real six-resource dataset, dynamic counts, local favourites. Submission explicitly identifies local-only prototype behaviour.

Interactions checked in browser: save/remove favourites; persistence after reload; favourites-only page; Paid filter; combined search and Paid; category expansion/filtering; empty subcategory; reset; mobile sidebar open/close. Browser console error check returned none.

Remaining limitations: six seed websites; some subcategories are intentionally empty. Collections and submission are lightweight prototype flows, with no backend. Thumbnail crops are representative, not full-page reproductions.

final result: passed

## Browse-first asset catalogue and admin workspace

Reference: `docs/design/uixo-browse-first-target.png`. Prototype: `http://127.0.0.1:4173/browse/assets`. Compared in dark theme with the expanded desktop sidebar, the unfiltered catalogue, and an open asset detail drawer. Responsive checks covered 1280px desktop, 800px compact desktop, and 600px mobile layouts.

- P0: none.
- P1: none.
- P2: none.
- P3: the live asset count remains in the result row below the view controls instead of beside the page title. This keeps the count accurate after filtering and preserves the selected hierarchy.

The catalogue matches the selected direction: slim black shell, favourites near the top of the sidebar, a small active marker without a filled menu slab, search before secondary controls, hidden advanced filters, three large desktop columns, proportion-preserving component previews, and a full-height right detail drawer with progressive disclosure.

Browser checks passed for search focus, pricing controls, Refine open/close, source-backed asset loading, variant resolution, internal route changes, drawer open/close, and responsive grid changes. The browser console reported no warnings or errors. The protected admin workspace is covered by live-API component tests and fail-closed routing.

final result: passed

## Be UI component replacement

The custom vanilla sidebar was replaced with the actual Be UI React component requested by the user. All four upstream component/helper files were compared with the downloaded registry and match verbatim. Composition follows the provided example with UILIST categories. The background token is now pure black (#000000).

Validation: production Vite build and TypeScript check pass. Browser checked desktop nesting, collapse/expand, mobile opening and Escape focus restoration. Browser console errors: none. The mobile focus behaviour is now provided by the original component rather than custom handlers.

final result: passed

## UI8-inspired discovery build

Source: legacy/mocks/ui8-target.png. Render: legacy/mocks/ui8-implemented.png (1487 × 1058), mobile: legacy/mocks/ui8-mobile.png (390 × 844). Source and rendered screenshots reviewed together. The rendered capture has Free selected; all six featured seed websites include a free offering, so the visible cards are unchanged.

Added creator metadata, interactive category/format chips, Featured/Recent, a format selector, expanded taxonomy and UI8 with a real screenshot. Existing Built by Designers remains available under Recent/Inspiration. Recent follows directory insertion order, not third-party release dates. Original Be UI component files remain unchanged.

Visual checks: black background and graphite controls preserved; three-column spacing, compact typography, metadata, tags and sidebar hierarchy match the approved direction. Real website screenshots deliberately replace generated thumbnails. Actual total is seven resources rather than the illustrative six.

Browser checks: Figma returns UI8; combined Figma + Paid + search returns UI8; clearing restores results; Recent shows seven entries ordered newest first; Framer subcategory returns UI8; mobile controls fit without horizontal overflow. No browser console errors. TypeScript and production build passed.

final result: passed
