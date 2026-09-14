# Using UIXO

## Which screen to open

`/browse` is the original website directory. Its categories describe resource websites, not a guarantee that individual files have been indexed from every website.

`/browse/assets` is the integrated individual-asset browser. It reuses UIXO's existing animated sidebar, top bar, account UI, theme and page heading. The **All assets** sidebar entry opens it from the website directory. **Websites / Assets** distinguishes the two catalogues. Website category links remain available and return to the directory.

The landing page `/` remains separate and has no sidebar, as before.

Visitor views at `/registry/` redirect to the integrated browser. The old registry interface remains temporarily for curator operations and the MCP connection utility; this is not a claim that all administrative screens have been migrated.

## Browse and acquire

1. Open **All assets**. Search with the top bar, `/` or `Cmd/Ctrl+K`.
2. Filter by type, source, framework, format, price or commercial-use evidence. Filters, pagination, saved view and open asset identity have shareable URLs.
3. Open a card. Inspect the source, variant, declared dependencies, licence and verification date.
4. Choose **Get asset / install instructions**. UIXO requests an acquisition decision from its existing backend. It may return a source URL, an installation instruction, an external purchase route or a blocked state.
5. Review any instruction yourself. Copying it does not execute it, modify your project or download a paid asset.

A source's inclusion is not an endorsement or a runtime test of every asset. Licence evidence is not a blanket guarantee for unrelated files at the same provider.

## What is actually in the seed

The source snapshots under `data/registry/` contain **175 metadata records**: 46 shadcn/ui components, 8 Lucide icons, 13 Heroicons, 75 Magic UI components and 33 Motion Primitives components. These are not downloaded component files or proof of runtime compatibility. Magic UI and Motion Primitives retain immutable source commits; the original three provider captures remain explicitly labelled as mutable until re-indexed.

The source snapshot does not populate fonts, templates, backgrounds, illustrations or motion libraries. The website directory may list those sources without their individual assets being indexed.

Original image previews are shown when available. Alert, Card, Input, Skeleton and Spinner use reviewed shadcn/ui source from immutable commit `2b3e6d4f8d9161fe5c19340dc383aade392012dd`. UIXO compiles those retained primitives locally and never executes source fetched at browse time. Their gallery and detail labels show the short source reference.

Every other component remains explicitly labelled **Illustration · not an upstream render**. **Source preview not captured** is intentional for records with neither an original image nor a reviewed renderer. The build verifies the five retained source files and upstream MIT licence byte-for-byte, allowing only UIXO's local `cn` import-path substitution.

## Saved assets

The sidebar has one **Favourites** section with separate **Websites** and **Assets** destinations and counts. Guest saves remain in the browser with a 200-asset limit. After sign-in, website lists and asset favourites sync through separate account-owned APIs. The first signed-in session safely imports guest saves; data cached for another account is never imported.

Writes wait for the account's remote baseline, replay explicit add/remove operations after concurrent edits and expose **Retry sync** after a failed request. Signing out clears account-owned browser snapshots while leaving the server copy intact.

## When the library is empty

A valid empty search response and a failed API are different states. The integrated UI distinguishes them.

Open `/api/registry?action=status`, then `/api/registry?action=search&limit=1` on the same deployment. Both should return JSON, not the site's HTML.

- JSON with zero published assets: check filters, database seeding and review/publication state.
- HTML instead of JSON: the API is not being served correctly, or only the Vite UI is running locally.
- 503: check registry startup, database configuration, migrations and bundled data-file access.
- 401/403: distinguish deployment protection, API authentication and origin rejection from a data problem.
- Preview unavailable but metadata present: this is a preview problem, not a missing asset.

Without `UIXO_DATABASE_URL`, the hosted runtime is designed to initialise a read-only in-memory snapshot. With `UIXO_DATABASE_URL`, it expects an explicitly migrated persistent registry and does not automatically seed it on a public request. `DATABASE_URL` alone does not configure the v2 registry.

The Vercel connector's permission failure is not proof of the application's runtime failure. Hosted behaviour must be checked separately.

## Curator and AI-agent utilities

`/registry/?view=review`, `?view=scout` and `?view=jobs` retain the existing curator workspace. Its authorization is enforced server-side. Grok discoveries are staged; an accepted intake item is not automatically a published asset.

**Connect your AI agent** opens `/registry/?view=connect`. The remote MCP endpoint is `/api/mcp`. Code for six MCP tools exists, but remote client interoperability and deployment acceptance remain verification gates. Do not describe a configured endpoint as a tested integration.

See [UIXO-SETUP.md](UIXO-SETUP.md) for local commands, credentials and deployment gates, and [STATUS.md](STATUS.md) for unfinished work.
