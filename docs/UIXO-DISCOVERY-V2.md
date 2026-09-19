# UIXO Discovery V2

Updated 19 September 2026.

## Position in the roadmap

**Discovery V2 is the completion sprint inside Product Phase 1: Registry + Discovery foundation.**

Registry Intelligence V1 created coverage reporting, source profiles, editorial collections, candidate/job/revision operations, structured Grok intake, bounded Eve tools and a nine-tool read-only MCP surface. Those capabilities are valuable, but much of the new product is currently hidden behind query-string routes, curator-only gates or unpublished collection drafts.

Discovery V2 makes the foundation visible, coherent and useful before UIXO moves into Phase 2 agent-scaled registry growth.

The previous shorthand that UIXO is roughly “70% through the foundation” and has “30% left” is not a measured engineering percentage. This document defines the actual remaining Phase 1 acceptance work.

## Mission

When Discovery V2 is complete, opening UIXO should make the evolution obvious without adding visual noise.

A visitor should understand that UIXO is not merely a directory of design links. It is a curated interface registry with real assets, source intelligence, editorial collections, provenance and a machine-facing interface.

The experience should stay restrained, modern and understated. Do not turn UIXO into a dashboard everywhere merely because Registry Intelligence exists.

## Information architecture

### Public Explore

1. **Assets**
   - Existing registry-backed asset discovery.
   - Inventory-aware categories and filters.
   - Strong preview and detail experience.

2. **Collections**
   - First-class navigation item, not a footer secret.
   - Visual editorial cards.
   - Ordered asset/provider selections and curator notes.
   - Public snapshot is independent from the editable draft.

3. **Sources**
   - First-class navigation item.
   - Provider cards with useful evidence dimensions.
   - Source detail with indexed assets, frameworks/formats, licence/provenance evidence, preview coverage and verification context.

4. **Saved**
   - Personal recall for saved assets.
   - Keep website and asset favourites clearly typed.

### Curator workspace

Only for authorised curator identities:

- **Registry Health** — coverage, freshness and evidence gaps.
- **Operations** — candidate → investigation → indexing → review → publication.
- **Editorial** — draft and publish Collections.
- **Indexing** — bounded provider/job controls and failure visibility.

These should be discoverable in the authorised UI. Hiding a route is not an authorisation mechanism; API permissions remain the security boundary.

## Initial published collections

Seed data may create drafts, but Discovery V2 requires actual editorial publication after review.

Target a deliberately small first set such as:

- Dashboard Foundations
- Authentication & Onboarding
- Navigation Essentials
- Forms & Inputs
- Motion & Interaction
- Landing Page Building Blocks
- Mobile Interface Essentials
- Dark Interface Systems

Names and exact membership can change during curation. Quality and usefulness matter more than hitting an arbitrary collection count.

Each collection should have:

- a visual identity/card;
- a clear editorial purpose;
- ordered items;
- concise notes explaining why an item belongs;
- source/provider context;
- framework/licence context where available;
- mobile and desktop acceptance.

## Source Intelligence experience

Source profiles should answer:

- What is this source?
- What has UIXO indexed from it?
- Which frameworks and formats are represented?
- What licence/provenance evidence is retained?
- What preview evidence exists?
- When was registry evidence last verified?
- What is explicitly **not** certified or checked?

Do not introduce arbitrary “quality scores”. Evidence and editorial judgement stay distinguishable.

## Asset detail upgrade

Discovery V2 should make existing registry evidence legible rather than merely storing it.

Prioritise:

- original source;
- provider;
- source/version reference;
- preview type;
- licence evidence;
- variants;
- dependencies / peer dependencies;
- compatibility status and unknowns;
- acquisition route;
- related collection/source navigation.

## Agent entry point

“Connect your AI agent” should be a visible product surface.

Explain that UIXO's API/MCP can support:

- asset search;
- asset inspection;
- source inspection;
- source health;
- collection listing/detail;
- compatibility/acquisition guidance within the implemented contract.

Do not imply that returning an acquisition recipe means UIXO has installed code into a user's project.

## Production activation

Discovery V2 is not complete simply because source code is merged.

Required activation work:

1. Select and back up the intended persistent registry environment.
2. Review and run additive migration `004-intelligence.sql`.
3. Verify public Sources and Collections.
4. Verify signed-in curator identity and private workspace access.
5. Verify unauthorised users cannot read/write private registry surfaces.
6. Publish reviewed initial Collections.
7. Verify web and MCP/API read the same approved registry state.
8. Fix and pass Chromium desktop/mobile Registry Intelligence acceptance.
9. Keep preview and production data boundaries explicit.
10. Record release evidence in `docs/STATUS.md`.

## Phase 1 acceptance

Product Phase 1 is complete when:

- Assets, Collections, Sources and Saved are obvious navigation destinations.
- Registry Health, Operations, Editorial and Indexing are obvious to authorised curators.
- Useful editorial Collections are published from real approved records.
- Source Intelligence is publicly usable.
- Asset details visibly expose meaningful provenance/licence/dependency/acquisition evidence.
- The persistent registry has the Intelligence V1 schema activated and verified.
- Critical visitor and curator journeys pass responsive browser acceptance.
- The same approved records are consistently queryable through web and MCP/API.
- No agent can bypass curator publication authority.

## Explicitly not required for Discovery V2

These belong after the Phase 1 foundation unless needed for a specific acceptance defect:

- autonomous/scheduled Eve;
- broad autonomous Grok operation;
- semantic search;
- visual similarity search;
- screenshot-to-component retrieval;
- specialised UIXO model training;
- Teams/private registries;
- enterprise SSO/governance;
- automatic project composition;
- a marketplace.

Those remain on the master roadmap. Discovery V2 should finish the current product rather than continuously expanding its scope.

## Build order

1. Visible navigation and information architecture.
2. Collections public experience and first reviewed publications.
3. Sources public experience.
4. Asset provenance/detail pass.
5. Curator navigation/workspace coherence.
6. Production migration/auth/API activation.
7. Responsive browser/CI acceptance.
8. Status/runbook update and Phase 1 release review.

After that, move deliberately into **Phase 2 — Agent-scaled registry growth**: Grok discovery and Eve investigation maintaining the same canonical registry.
