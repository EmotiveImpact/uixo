# Bugs and fixes

Real defects found and what was done about them. Kept because most of these were invisible
in the source and only showed up when something was actually run.

---

## The auth check could never have worked

**Found:** testing a signed-in non-curator against production, then promoting them to admin
in the database. Still refused.

**Cause:** the API identified callers by forwarding the request's session cookie to Neon
Auth. But that cookie belongs to the auth service's own domain, so a browser on
`uixo-brown.vercel.app` never attaches it to `/api`. No cookie was ever arriving.

**Fix:** the client fetches a short-lived signed token; the API verifies its signature
against the keys the service publishes. The role is then read from the database, so
promotion takes effect immediately rather than whenever the token expires.

**Lesson:** it _looked_ correct and would have passed review. Only exercising the real
cross-origin path revealed it.

---

## Sign-in worked, then you were not signed in

**Found:** by you, using it. I had tested only in Chrome.

**Cause:** Neon Auth sets its session cookie on its own domain, making it a third-party
cookie. Safari blocks those outright and Firefox and Chrome are closing the same door. The
sign-in POST succeeded and the cookie was stored — and nothing was ever allowed to send it
again, so every subsequent "who is this?" came back empty.

**Fix:** `api/auth.ts` proxies Neon Auth through UIXO's own origin, so the cookie is
first-party. `Partitioned` and `SameSite=None` are stripped on the way back: both exist to
make a third-party cookie survive, and once it is first-party the first would key it to the
embedding site and the second would needlessly permit it on other people's pages.

**Two things it took to get there:** a zero-config `[...catch-all]` under `api/` is not
built for a non-Next project — Vercel generated a route but no function, so auth requests
fell through to the SPA rewrite and a static page answered POST with 405. And Vercel's
`x-forwarded-host` names _this_ site, which the upstream rightly refuses, so every proxied
request returned `INVALID_HOSTNAME` until the forwarding headers were stripped.

**Lesson:** testing in one browser is testing in one browser. The whole class of bug was
invisible in Chrome.

**And a second bug the fix created:** proxying repaired email and password everywhere and
broke Google entirely. Neon Auth's shared Google app returns users to Neon's own domain, so
that session cookie is created there — and the proxy forwards only this site's cookies, so
it can never see it. Before the proxy, Google worked in Chrome and nowhere else; after it,
nowhere at all. The button was removed rather than left completing a whole OAuth round trip
and leaving the user signed out. It can return when Neon Auth can be served from our own
subdomain.

---

## The dashboard read from the browser while the API wrote to the database

**Cause:** submissions started reaching Postgres correctly before the dashboard was moved
off localStorage. A stranger's suggestion arrived and appeared nowhere anyone would look.

**Fix:** the dashboard fetches from `/api`, and decisions roll back if the server
disagrees rather than displaying a decision that did not stick.

---

## Every new thumbnail would have rendered blank

**Found:** before the scout's batch of 155 screenshots landed, by checking what a
`<picture>` actually does when its chosen `<source>` is missing.

**Cause:** a `<picture>` whose `<source>` 404s does **not** fall back to its `<img>` — it
errors. Every card unconditionally offered a WebP variant, which only existed for images
already processed. 155 correct PNGs would have produced 155 blank tiles.

**Fix:** the generator writes a manifest of ids it has variants for, and the app only
offers WebP for those.

**Lesson:** the failure would have looked like "the screenshots are broken" while the
screenshots were perfectly fine.

---

## Imported components were shown with fabricated previews

**Found:** by you, after opening the Magic UI asset grid. The imported records had different
names and metadata, but the cards showed repeated UIXO-made illustrations instead of the
components themselves.

**Cause:** the registry importer deliberately assigned every React component a `schematic`
preview. The UI then routed unknown slugs into a generic drawing and later into one of twelve
invented visual families. That made the grid look varied while still misrepresenting the
asset. The ingestion also treated install-registry paths as repository paths. For Magic UI,
the real source root is `apps/www/`; seven manifest entries did not have their claimed source
file at the pinned commit at all.

**Fix:** UIXO now captures the rendered demo canvas from each provider's official component
documentation and commits the result as a local WebP. The catalogue uses 147 real demo
captures: 46 shadcn, 68 Magic UI, and 33 Motion Primitives. Magic UI source links now include
the real repository root. The seven entries without source at the pinned revision are
excluded instead of being given a substitute preview. The invented semantic renderer and
its fallback illustrations were removed.

**Prevention:** `npm run previews:verify` derives the expected component set from the captured
registries and provider exclusion policy, then requires exactly one valid WebP and official
source URL for every publishable component. Registry tests require component previews to be
images, reject schematic placeholders, verify corrected source paths, and assert that
unbacked manifest entries stay excluded. A missing or changed provider demo now fails the
build; it cannot quietly become an approximation.

**Rule:** a preview is evidence about the asset. If the real render cannot be captured, show
it as unavailable or keep the record unpublished. Never replace it with something that only
looks similar.

---

## Every URL served the landing page to crawlers

**Found:** testing routes against the live deployment rather than reading the config.

**Cause:** the SPA rewrite used a negative-lookahead regex. Vercel parses `source` as
path-to-regexp, so it matched nothing and every non-prerendered route hit Vercel's own 404.
Replacing it with a catch-all still failed, because it pointed at `/index.html` and
`cleanUrls` turns that into a redirect.

**Fix:** catch-all rewrite targeting `/`. The filesystem is checked first, so prerendered
pages still win.

---

## Canonical URLs pointed at a domain we do not own

**Cause:** a placeholder `uixo.dev` left in the prerender script. Every page told search
engines the authoritative version lived elsewhere — handing ranking to whoever registers it.

**Fix:** `SITE_URL` set to the real host; the fallback changed to `uixo.io`.

---

## Serverless functions crashed on every request

**Cause:** Vercel compiles `api/*.ts` to ESM, where Node requires explicit `.js` extensions
on relative imports. The platform reported only `FUNCTION_INVOCATION_FAILED`; the real
cause was visible only by importing the built artefact directly.

---

## A category with no icon would crash the sidebar

**Cause:** icons were paired to categories by array position. An eleventh category would
have rendered `undefined` as a component.

**Fix:** icons resolve by name through a lookup with a fallback.

---

## Thumbnails were framed differently on every surface

**Cause:** four listings were centre-cropped by selectors that only matched the browse card.
The landing page, quick view and collection covers never inherited them.

**Fix:** framing moved into the listing data and applied through one CSS custom property.

---

## Tests asserted the contents of a file another agent owns

**Found:** twice, when the scout pushed new candidates.

**Cause:** tests asserted "no duplicates, no taxonomy errors" against the live candidates
file. True when written, false on the next push.

**Fix:** assert behaviour instead — every row is accepted or dropped with a reason, nothing
already live reaches the queue. Those hold regardless of what the scout sends.

**Worth noting:** the importer was right both times. It caught `react-bits` and `shadcn-ui`
as duplicates of live `reactbits` and `shadcn` — different ids, same site.

---

## Smaller ones

- **Theme did not persist.** Picking light mode and refreshing returned you to dark. Now
  stored, and follows `prefers-color-scheme` when unset.
- **17 of 29 subcategories were dead ends.** Empty ones are hidden.
- **URL parameters were cast, not validated.** `?price=Banana` silently filtered out
  everything. Unknown values now fall back.
- **Escape did not close the command palette** once focus moved to a result.
- **The skip link did not move focus** — the target was not focusable.
- **`robots.txt` invited crawlers into `/dashboard` and `/review`.**
- **The RSS feed was generated but never linked**, so no reader could find it.
- **A stale `useMemo` dependency** meant navigating between two collections showed the
  previous one's results.
- **The mobile topbar overlapped** after a fourth control was added to a three-column grid.
- **The quick view auto-scrolled** past its own preview on open.
- **`db/schema.sql` claimed to be re-runnable** but every `create type` failed on a second
  apply.
