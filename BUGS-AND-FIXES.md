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
