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

## Adding a library

1. `node scripts/vendor-provider.mjs <provider> <owner/repo> <commit> [--strip <prefix>] <licence> <globals.css> <demo files>...`
   copies the files unchanged from the pinned commit, follows their `@/` and relative
   imports, records every file in `source-lock.json`, and prints the npm packages the
   files import. Add those to `package.json` with `npm install --ignore-scripts`.
2. Give the library its own theme in `themes/<provider>.css`: its own globals, then
   `../stage.css`, then `@source '../vendor/<provider>'`. The harness loads only that file
   for the library's demos, so its tokens and keyframes never meet another library's.
   The first four libraries share `styles.css`.
3. Add one manifest entry per component, pointing at the demo the provider's own docs
   page leads with, and the provider's origin to `origins` in `main.tsx`. A demo laid out
   for a desktop page can add `"viewport": <width>`: its card opens it at that width
   (height in proportion) and shows it smaller, so it keeps its desktop layout. Prefer
   that to CSS `zoom`, which keeps the phone layout and can upset demos that measure
   themselves.
4. Check every demo in both themes:
   `node scripts/check-live-demos.mjs http://127.0.0.1:4176 <out> <provider>/` against
   `npx vite --config live-demos/vite.config.mjs`. Look at the contact sheets it writes,
   not only the report.
