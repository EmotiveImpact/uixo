# Brand and card refinement

Follow-up to the user's review of the corrected prototype layout, 20 September 2026.

## Preserve

- Original Inter typography and plain, spaced UIXO wordmark: weight 500, 5px letter spacing.
- Approved split homepage hero, full-width shared header, browse sidebar and first-viewport grid.
- Real component previews, recorded screenshots, catalogue counts, provider approvals and saved data.

## Refine

- Remove the tightly tracked replacement wordmark and unused decorative dot.
- Restore lighter heading weights and more comfortable navigation, sidebar and search text.
- Match the HTML prototype's continuous rounded preview/caption cards on Components and Resources.
- Place save controls beside titles rather than using fixed offsets that can collide with text.
- Keep the header search action compact; the actual page search remains available.

## Verification and boundaries

The normal browser acceptance suite now checks the wordmark's computed weight, spacing and declared Inter family, and the full card frame and caption padding. Its existing search, filter, save/reload, mobile focus, real preview and overflow checks remain in place.

This follow-up is a visual refinement, not a production release or a claim of complete pixel parity with every concept image. No database writes or provider changes. See PR #48 for final check and preview status.
