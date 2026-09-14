# Original live component demos

147 catalogue entries render React source, not screenshots. `manifest.json` maps each
asset to the original provider demo at an immutable Git commit. `source-lock.json`
records the SHA-256 and upstream URL of every retained source file. Original MIT
licences are retained in each provider directory. Do not rewrite vendor components
into approximations or silently replace failing demos with images.

146 entries use the provider's demo. Animated Subscribe Button has no demo in the
pinned release; `examples/animated-subscribe-button.tsx` supplies its required two
text children to the unchanged original component.

The preview build is separate from the application. `npm run demos:build` installs
its locked dependencies with lifecycle scripts disabled, then builds lazy chunks
into the ignored `public/live-demos` directory. The main production build includes
these static files. No upstream code is fetched or evaluated at request time.

Each frame has `sandbox="allow-scripts"`, without same-origin, forms, popups, or top
navigation permission. It cannot access UIXO's cookies, local storage or DOM.
Demo-only localStorage, sessionStorage and cookie adapters keep state in memory inside
the frame, allowing original theme/sidebar controls to operate without accessing real
browser storage. This state disappears when the frame unmounts.
Provider source remains unmodified. Adapters replace Next's Link and Image with browser
elements, and next-themes with the theme supplied by the host frame. Form submissions
are local demonstrations. Provider links are inert inside the demo. Data-dependent
previews (notably tweets) still depend on their original public data service.

The host mounts frames near the viewport and unmounts them when scrolled out. Each
frame imports only its selected demo. Themes update through source-checked messages.
A runtime failure offers the original provider link; it never falls back to an image.

Verification: `node scripts/verify-live-demos.mjs`, the main preview tests, and browser
interaction checks. Test actual clicks/typing and dark/light themes, not just a build.
