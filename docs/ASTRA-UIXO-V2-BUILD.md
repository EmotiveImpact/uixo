# UIXO v2 — Astra autonomous build brief

## Mission

You own the build of UIXO v2 on this branch.

Transform UIXO from a high-quality curated directory of design resources into a production-grade **design intelligence and asset infrastructure platform for humans and AI coding agents**, without destroying what makes the current product valuable.

The existing public proposition remains important: UIXO is curated, opinionated, useful, and trustworthy. The new system adds a deeper machine-readable layer beneath it: a registry of sources, individual assets/components, provenance, licences, compatibility, acquisition methods, previews and quality signals, exposed through the UIXO web app, API and MCP.

This is not a prototype brief. Build the strongest credible version that can ship from the current repository, make product and design decisions where needed, test them, polish the experience, document the system and leave the repository in a reviewable, deployable state.

Do not wait for permission on ordinary product or engineering decisions. Use judgement. Prefer finished coherent systems over half-built breadth.

---

## Current product truth

Before changing anything, inspect the repository thoroughly.

Important existing principles and systems:

- UIXO is currently a hand-curated directory of UI/front-end resources.
- Public content is intentionally curated rather than blindly scraped.
- `src/content/*.json` is the current source of truth for live editorial content.
- Neon/Postgres mirrors the content and already contains users, resources, categories, collections, lists, submissions, reports and sponsorship structure.
- There is a scout/candidate pipeline under `data/` with human review before publication.
- Existing scripts already support prerendering, link checking, candidate application and thumbnail generation.
- The current UI philosophy separates the landing experience from the browse/tool experience.
- Existing provenance matters. Vendored third-party code has source attribution.
- “Featured” is editorial and must never silently become “paid”.
- The existing UI should be evolved, not casually replaced with a generic AI SaaS dashboard.

Read at minimum:

- `README.md`
- `VISION.md`
- `docs/CONTENT.md`
- `data/README.md`
- `db/schema.sql`
- `COMPONENT-SOURCE.md`
- `CHANGELOG.md`
- existing tests and application structure

Run the existing checks before major changes and preserve working behaviour unless a deliberate migration improves it.

---

# Product model

UIXO v2 should have four connected surfaces.

## 1. UIXO Web

Human interface for discovering, evaluating, saving and understanding high-quality design resources and assets.

The web experience should remain beautiful, fast and editorial. Do not turn it into an administrative database browser.

Humans should be able to:

- browse trusted resource providers
- search individual assets/components
- filter by category, framework, format, licence, price, style and compatibility
- inspect previews and provenance
- understand why an item is useful
- see how it can be acquired or installed
- save resources/assets into lists
- clearly distinguish editorial recommendations from sponsorship

## 2. UIXO Registry

The canonical structured intelligence layer.

The registry knows:

- approved source/provider
- individual assets/components within providers
- asset type
- source location
- creator
- licence and redistribution rules
- price/access model
- framework/runtime
- code language
- dependency requirements
- package/registry/API/download information
- tags and aliases
- visual/style metadata
- preview media
- compatibility information
- provenance
- freshness / last verification
- acquisition strategy
- trust / editorial state

Do not require every indexed asset to be individually editorially endorsed. Distinguish clearly between:

- **curated provider/source**
- **indexed asset from curated provider**
- **editorial asset pick**

This distinction is critical to scale while preserving “Handpicked, not scraped”.

## 3. UIXO MCP

Machine interface for AI coding agents.

Implement a proper MCP server against the current official MCP specification. Verify current official documentation before coding rather than relying on stale assumptions.

Minimum useful tool surface:

- `search_assets`
- `inspect_asset`
- `get_preview`
- `check_compatibility`
- `resolve_asset`
- `acquire_asset`

Where useful, expose read-only MCP resources for catalogue metadata and documentation.

The MCP should be intentionally small and composable. The intelligence belongs in the registry and provider adapters, not in dozens of MCP tools.

Example intent:

> Find a dark animated React hero background, suitable for Tailwind, free for commercial use.

Expected response should be structured enough for an agent to rank candidates, understand provenance/licensing and decide what it can safely retrieve.

## 4. UIXO Agents / ingestion workers

Build the first credible autonomous indexing workflow, designed to grow later into specialised workers.

Long-term conceptual roles:

- Scout
- Indexer
- Licence checker
- Visual analyser
- Code/framework analyser
- QA/freshness checker

For this build, do not create fake AI theatre. Implement a useful deterministic ingestion foundation with clear extension points for model-assisted classification where valuable.

A provider/indexing run should be able to:

1. start from an approved provider/source
2. discover candidate assets when the source structure permits it
3. normalise metadata
4. identify framework/format/dependencies when evidence is available
5. attach provenance
6. propose licence/acquisition status
7. capture or associate preview metadata
8. stage changes for review
9. never auto-publish editorial endorsement without the appropriate review state

---

# Core architecture

Use the existing project unless there is a compelling technical reason to introduce a workspace structure. Avoid unnecessary rewrites.

A strong target model is:

```text
UIXO Web
   │
   ├── UIXO API ──────────────┐
   │                          │
UIXO MCP                      │
   │                          │
   └──────── UIXO Registry ───┤
                              │
                   Provider adapters
                              │
            Git / registries / APIs / URLs
```

The public website, internal curator experience, MCP and future SDK should consume the same registry concepts.

---

# Data model

Extend the database carefully rather than overloading `resources`.

The current `resources` concept should remain the top-level trusted resource/provider listing where appropriate.

Introduce a normalised model along these lines, adapting names where implementation evidence suggests something cleaner:

## `providers`

Represents a source from which assets may be indexed or acquired.

Suggested fields:

- id
- resource_id nullable/linked where relevant
- name
- canonical_url
- provider_type
- trust_state
- index_strategy
- acquisition_capabilities
- default_licence_id if safely known
- metadata JSONB for provider-specific non-canonical data
- last_indexed_at
- last_verified_at
- active

## `assets`

Suggested fields:

- id
- provider_id
- slug
- name
- description
- asset_type
- category
- subcategory
- tags
- aliases
- creator
- editorial_state
- indexed_state
- source_url
- documentation_url
- preview_url / preview metadata
- last_verified_at
- created_at
- updated_at

## `asset_variants`

Represents actual usable versions.

Suggested fields:

- id
- asset_id
- framework
- language
- format
- package_name
- package_version where appropriate
- source_ref
- dependencies
- peer_dependencies
- runtime_notes
- compatibility metadata
- acquisition_strategy
- acquisition_locator
- checksum where applicable
- metadata

## `licences`

Normalise licences where practical.

Suggested concepts:

- identifier
- name
- source URL
- commercial use status
- redistribution status
- attribution requirement
- modification status
- confidence/evidence

Do not invent licence permissions. Unknown should remain unknown.

## provenance / verification

Create structured provenance/evidence records if that produces cleaner semantics than embedding everything in JSON.

At minimum the system must be able to answer:

- where did this fact come from?
- when was it last checked?
- was it inferred or directly declared by the source?

## previews

Support image previews first. Design so video/interactive preview metadata can be added later without a destructive migration.

---

# Acquisition model

This is a major product boundary.

UIXO must not become a piracy proxy or redistribute assets when the source/licence does not permit it.

Implement explicit acquisition strategies such as:

- `direct`
- `package`
- `git`
- `registry`
- `provider_api`
- `oauth`
- `external_download`
- `purchase`
- `uixo_mirror`

Names may differ, but semantics should remain explicit.

Rules:

- Open-source / redistributable assets may be retrieved through authorised public mechanisms.
- Paid or account-gated assets should resolve to the authorised purchase/download flow unless an official API/auth mechanism allows more.
- Never bypass authentication, purchase gates or technical access controls.
- Never label uncertain licence status as safe.
- Preserve original source attribution.
- Prefer resolving to original authoritative sources.

`acquire_asset` must return a safe result appropriate to the strategy. For example, a package install instruction, registry endpoint, Git reference, authorised download link, purchase page or explicit “manual authorisation required” state.

---

# Search and intelligence

UIXO should be significantly better than a raw keyword directory.

Build a search layer that supports natural intent while remaining explainable.

It should use a combination of:

- names
- descriptions
- aliases
- tags
- category/subcategory
- framework
- format
- licence/access constraints
- asset type
- visual/style metadata where available
- quality/editorial state
- freshness

If vector/semantic search is introduced, keep deterministic filters for hard constraints such as framework, licence and pricing. Semantic similarity must never override a hard filter.

Design the query layer so the web app, API and MCP reuse it.

Examples that should become feasible:

- “minimal monochrome icon set with React package”
- “animated React hero, dark, WebGL, commercially usable”
- “clean dashboard sidebars that work with Tailwind”
- “free serif display font with web licence”

Provide ranking rationale in machine-readable form where useful.

---

# Provider adapters

Create a provider adapter interface so UIXO is not hard-coded around one source.

A provider adapter should be able to implement some combination of:

- discover assets
- inspect asset
- resolve source
- resolve preview
- resolve licence evidence
- resolve acquisition
- verify freshness

Build a small number of high-quality initial adapters rather than many fragile ones.

Choose 5–10 strong sources already represented in UIXO that demonstrate different acquisition models.

Prefer sources with stable, legitimate machine-readable surfaces first, for example public Git repositories, npm-backed libraries, shadcn-style registries or official APIs.

For websites with no stable public API/registry, keep indexing conservative and provenance-rich. Do not create brittle scraping that will immediately become maintenance debt.

---

# Initial proof target

The v2 thesis is proven when UIXO can take a relatively small set of trusted sources and expose a materially larger searchable asset universe beneath them.

Aim for a credible seed index, ideally hundreds to low-thousands of individual assets if source APIs/registries make this practical, but **quality and correctness beat an arbitrary count**.

A smaller set with excellent provenance, licence handling, compatibility and acquisition is better than 50,000 unreliable rows.

---

# Web product design

You have authority to make design decisions, but preserve UIXO’s identity.

Design values:

- editorial rather than generic SaaS
- premium but restrained
- typography-led
- high information clarity
- excellent density without clutter
- polished motion only where it aids understanding
- fast
- obvious trust/provenance
- visually useful previews
- dark/light support only if it remains coherent with the current product

Do not redesign simply because you can.

## Browse evolution

The browse experience should support two conceptual levels without confusing the user:

1. trusted resources/providers
2. individual assets/components

Find a clean interaction model. Possible directions include segmented modes, scoped search or a unified results experience with strong type labelling. Choose based on usability, not feature count.

## Asset detail / quick view

An asset should communicate quickly:

- what it is
- preview
- source/provider
- why it is useful
- framework / format
- licence confidence
- price/access
- dependencies
- acquisition/install route
- verification date
- related/similar assets

## Trust UI

Surface meaningful states such as:

- Curated provider
- Editorial pick
- Indexed from curated provider
- Licence verified / unknown
- Source verified date

Avoid fake badges and gamified noise.

## Curator interface

Extend the curator workflow so staff can review:

- new providers
- indexed assets
- uncertain licences
- broken acquisition routes
- stale verification
- duplicates

Bulk tools are encouraged where safe.

---

# API

Create a stable internal/public API boundary rather than having the MCP directly reach into random database queries.

Minimum conceptual endpoints/services:

- resource/provider search
- asset search
- asset detail
- compatibility evaluation
- acquisition resolution
- curator ingestion/review actions

Choose REST/RPC conventions that fit the existing Vercel architecture and codebase.

Use runtime validation for external inputs and outputs.

Design for pagination and future rate limiting.

---

# MCP implementation requirements

Before implementation, verify the latest official MCP protocol and SDK guidance.

Requirements:

- production-grade server structure
- schema-validated tool inputs
- compact structured outputs
- safe error handling
- no accidental secrets in responses/logs
- provenance in results
- licence/access state in results
- sensible pagination/limits
- compatibility with remote deployment where practical
- tests for every exposed tool

Do not return huge blobs of code or binaries into model context when a resource/download/source reference is more appropriate.

The MCP server should be usable by a coding agent without needing to understand UIXO internals.

---

# Compatibility engine

Implement a useful first version rather than pretending compatibility is magically knowable.

Input may include:

- framework
- framework version
- React version
- CSS stack
- language
- installed packages
- runtime/build tool

Output should distinguish:

- compatible
- probably compatible
- requires dependency/change
- incompatible
- unknown

Include reasons and evidence.

Unknown is acceptable. False certainty is not.

---

# Security and legal safety

Treat all provider content as untrusted external input.

Requirements:

- sanitise/validate remote metadata
- no arbitrary remote code execution during indexing
- avoid SSRF risks in fetchers
- enforce host/protocol restrictions where necessary
- rate limit external fetching
- respect robots/API terms where applicable
- do not bypass paywalls/authentication
- do not embed third-party secrets in the repo
- keep env configuration documented in `.env.example`
- record attribution/provenance
- avoid mirroring assets unless permitted

If acquisition requires user credentials for a provider, design an explicit future OAuth/auth path rather than asking users to paste sensitive credentials into prompts.

---

# Performance

UIXO should remain fast even as the registry grows.

Pay attention to:

- indexed DB queries
- pagination
- search query plans
- preview optimisation
- lazy loading
- caching where appropriate
- static/prerender strategy for public SEO pages
- keeping giant asset indexes out of the browser bundle

The current static JSON model cannot simply scale to tens of thousands of assets shipped client-side. Migrate large indexed data to server-backed reads while preserving editorial content/prerender behaviour where it remains advantageous.

---

# Migration strategy

Do not break the current product while introducing v2.

A sensible sequence is likely:

1. schema + domain types
2. query/service layer
3. seed provider adapters and ingestion
4. asset search API
5. web browse/detail integration
6. MCP server
7. curator tooling
8. polish, testing, documentation, deployment configuration

You may choose a better sequence after inspecting the repository.

Provide migration/seed scripts that are safe to re-run.

Existing resource IDs and public URLs should remain stable wherever possible.

---

# Testing and quality bar

This build is not complete because it compiles.

Add tests for:

- schema/domain validation
- indexing normalisation
- duplicate handling
- licence unknown/known states
- acquisition resolution
- compatibility evaluation
- search filtering/ranking behaviour
- MCP tool schemas and responses
- API behaviour
- critical web interactions
- curator review transitions

Run and fix:

- typecheck
- tests
- lint
- formatting
- production build
- existing link checks where reasonable

Add new checks/scripts where they materially improve reliability.

No knowingly broken states, placeholder buttons or fake data in the production UI.

---

# Observability

Add basic structured logging around:

- provider indexing runs
- failures
- stale providers
- acquisition resolution errors
- MCP tool errors

Avoid logging secrets or unnecessarily sensitive user information.

If a full observability vendor is not already part of the project, keep the initial implementation vendor-light and well-structured.

---

# Documentation

Update repository documentation so the next engineer/agent does not need this conversation.

At minimum provide:

- architecture overview
- registry data model
- provider adapter contract
- acquisition rules
- ingestion/review workflow
- MCP local development and deployment
- how to add a provider adapter
- how to seed/index assets
- environment variables
- deployment notes
- known limitations
- security/licensing philosophy

Update `README.md`, `VISION.md`, `CHANGELOG.md` and relevant docs where the product has genuinely changed.

Do not erase the original vision. Explain how the new asset intelligence layer preserves it.

---

# Product decisions you are authorised to make

You may independently decide:

- component and page structure
- information architecture
- interaction patterns
- database normalisation details
- API route structure
- provider adapter interface
- search implementation
- MCP transport/SDK implementation consistent with current standards
- loading/empty/error states
- responsive behaviour
- typography scale and spacing
- motion details
- icon choices
- curator workflow improvements
- internal naming
- sensible dependency additions

You do not need approval for ordinary reversible engineering/design decisions.

Do not make irreversible commercial/legal decisions, buy services, change domains, expose secrets, delete user data or weaken provenance/licensing safeguards.

---

# Definition of done

The branch should be considered ready for review only when all of the following are true:

1. Existing UIXO core behaviour remains functional or has a documented deliberate replacement.
2. Database/domain model supports providers, individual assets, variants, licences/provenance and acquisition strategy.
3. At least several real provider adapters work against legitimate sources.
4. A real seed asset index has been generated from those providers.
5. Humans can search and inspect individual assets in the UI.
6. Results clearly show provenance, access and licence state.
7. Acquisition resolution works safely for the supported provider types.
8. Compatibility checking provides useful, evidence-based responses.
9. MCP exposes the minimum production tool set and is covered by tests.
10. Curators can review indexed content and uncertain states.
11. Large registry data is not shipped as one giant browser bundle.
12. Existing and new tests/typecheck/lint/build pass.
13. Documentation is complete enough for another engineer or coding agent to continue without oral context.
14. UI is polished across desktop and mobile, including empty/loading/error states.
15. No placeholder production UI or invented licence claims remain.
16. Changes are committed in coherent commits on this branch.
17. Open a pull request to `main` with a concise architecture summary, screenshots if practical, test results, migration/deployment steps and any remaining known limitations.

---

# North-star experience

The system should make a flow like this believable:

> A developer asks their coding agent: “Find a premium dark animated React hero, commercially usable, compatible with this project.”

The agent calls UIXO.

UIXO understands the project constraints, searches trusted sources and indexed assets, returns several strong candidates with previews, provenance, licence/access state and compatibility reasoning.

The developer chooses one.

UIXO safely resolves the authorised acquisition route, and the coding agent can then install or integrate it without pretending UIXO owns the source material.

That is the product.

---

# Final principle

**Taste is the moat. Infrastructure is the scale. MCP is one interface, not the product.**

Preserve the curated human judgement that made UIXO worth visiting while building the machine-readable intelligence layer that makes it worth integrating.
