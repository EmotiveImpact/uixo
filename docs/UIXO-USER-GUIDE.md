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

The source snapshot at `data/registry/captured.json` contains **67 metadata records**: 46 shadcn/ui components, 8 Lucide icons and 13 Heroicons. This is not thousands of downloaded files or a completed live indexing run. Seed source references are mutable and explicitly labelled as such.

The source snapshot does not populate fonts, templates, backgrounds, illustrations or motion libraries. The website directory may list those sources without their individual assets being indexed.

Original image previews are shown when available. **Source preview not captured** is intentional, not an invented screenshot or an upstream component render. Real component preview capture remains unfinished.

## Saved assets

The bookmark button uses the existing `uixo.asset-saves.v2` browser-storage format. Existing saves are preserved, with a 200-asset limit. These are not account-synchronised lists and are distinct from website lists in the main sidebar. A storage error is shown rather than claiming a durable save.

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
