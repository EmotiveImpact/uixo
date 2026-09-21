# Approved prototype layout implementation

This replaces the earlier CSS-only interpretation in PR #48. The visual reference is the dark UIXO Discover, component browse, detail and mobile prototype approved in the conversation. Generated placeholder provider counts and invented sample installation commands are not catalogue evidence and are not copied into the application.

## Layout contract

- One full-width public header above both catalogues.
- No homepage sidebar. A compact category, framework and provider filter sidebar on browse routes.
- The component grid appears in the first viewport, not below an editorial dashboard.
- Four component columns at 1440 px, responsive columns below that width.
- A split homepage hero with actual retained component screenshots, working search and curated resource thumbnails.
- Large two-column component detail with the actual component on the left and existing source, save and installation actions on the right.
- Light and dark themes use the same layout. Mobile navigation remains keyboard dismissible.
- Source/licence evidence remains accessible through detail disclosure. It is not removed to make the interface cleaner.

## Preview boundaries

Live previews retain their existing isolated runtimes. Where the record already contains an actual screenshot, it can appear when live rendering fails. The displayed badge distinguishes loading, live, screenshot fallback and unavailable states. This layout change does not generate missing provider screenshots, invent components, publish Kibo, or alter the ingestion allowlist.

The homepage uses four existing retained screenshots, labelled as screenshots. The small button tile uses native-scale image framing, not regenerated artwork.

## Verification

`tests/browser/redesign.py` covers homepage, component browse, resource browse and actual component detail at 1440 px and 390 px in both themes. It checks header width, first-grid position, four-column layout, genuine hero image loading, mobile navigation, query filters, saves surviving reload and homepage search. Screenshots are retained as normal CI artefacts.

The corrected application passes the local complete production build, formatting, lint, explicit typecheck and 209 application tests. The first hosted screenshot pass exposed decorative hero overflow; the orbit was inset and its canvas now contains its decoration. Browser acceptance uses GitHub Actions Chromium because the local managed browser blocks navigation. The final result is the latest normal CI run, not an earlier screenshot pass.

The acceptance suite paces full-page navigation to respect the unchanged 180-request/minute public limit. It retains partial results and failure details rather than masking a missing catalogue as an empty result. Screenshots are taken after the component is ready, and detail checks inspect the foreground preview rather than an obscured background grid.

Additional regression coverage checks clickable screenshot fallback, preserving filters when opening an asset, modified links, failed capture notices, the actual Templates directory destination and keyboard focus returning after closing the mobile menu. The homepage Ctrl/Cmd-K now focuses its real search field. Custom saved-resource lists remain reachable in the new sidebar.

## Release

Work remains in draft PR #48. No automatic merge, provider sync or production database write. The current catalogue remains independent from the separately reviewed Kibo ingestion PR #44. Use the specific Vercel preview associated with the latest PR commit; old immutable preview URLs continue to show old layouts.
