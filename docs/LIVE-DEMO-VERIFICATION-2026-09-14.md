# Live component verification — 14 September 2026

## Completed

- Browser audit: all 147 component entries mounted their original demos successfully.
- Initial audit found shadcn Input Group missing a TooltipProvider. Added the provider to
  the preview host and reran all 147: no load failures.
- Manual interaction: shadcn Accordion expanded/collapsed in its own page and in UIXO's
  detail drawer. A typed value remained visible in the original Input component.
- Light/dark: UIXO's theme propagated into already-mounted frames without resetting
  their state; inspected the frame root and visible rendering.
- Original Magic UI theme toggle changed theme; original shadcn mobile sidebar opened.
  Their cookie/storage calls use frame-local memory adapters, never UIXO storage.
- Sidebar collapse persisted when moving from Assets to Websites and after a reload.
  Two regression tests also cover remounts and cross-tab changes.
- UI tests: 170 passed. Typecheck, lint, source integrity check and production build passed.
- Source integrity: 311 retained original files, with hashes, commit URLs and MIT notices.

## Scope

The browser audit verifies mounting, not every possible interaction in every component.
Some original demos depend on external media/data (for example tweet content). These
retain those dependencies. Errors offer the original provider link; component screenshots
are never silently substituted for live demos. Static icons remain their original SVGs.

Radix Primitives is installed in the shared application. Pricing, browse-order controls
and the theme tooltip use it. This is not a migration of every existing native control
or modal to Radix, and it does not install Radix Themes or change UIXO's visual design.
