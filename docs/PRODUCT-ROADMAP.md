# UIXO master product scope and roadmap

Updated 19 September 2026. This document is the source of truth for UIXO's product destination and sequencing; it does not claim that planned products already exist. The [engineering audit](PRODUCT-AUDIT-2026-09-12.md) records defects and implementation gaps. The [original v2 brief](ASTRA-UIXO-V2-BUILD.md) remains the detailed foundation specification.

## Evidence and decision status

Sources: the full available text histories of [UIXO vs UIOX Comparison](https://chatgpt.com/c/6aa4e871-aefc-83eb-b288-8f5d24c97ac5), [Define UIXO Business Model](https://chatgpt.com/c/6aa4ead5-f83c-83eb-924e-02fcf90e54bd), [Build UIXO Asset MCP](https://chatgpt.com/c/6aa4ce7e-bbc0-83eb-a538-fc2c93faaf1e), and [Design UIXO Logo Concepts](https://chatgpt.com/c/6aa27fea-db5c-83eb-8913-4481246a3ad3), together with the current repository and direct UI instructions in this implementation task. Some generated images were unavailable through text retrieval; exact artwork is not approved by this document.

- **Established direction:** repeated user intent or explicit build scope. Preserve it while implementing.
- **Proposed product:** explored in the discussions, captured here without implying launch approval or completed implementation.
- **Open decision:** requires evidence, a concrete design or commercial validation before commitment.
- **Implemented / partial / unverified:** engineering status, separate from product intent. Code presence does not mean a live workflow passed.

Phases below are a proposed delivery sequence, not dates or promises of simultaneous launches. Product editions, application screens and engineering releases are different things.

## Product thesis

UIXO is the interface/design intelligence layer for humans and software-building agents. Its durable value is a trustworthy registry: what an asset is, where it comes from, what it looks like, which variant fits, what the evidence permits, and how to use it.

The website serves people. API/MCP serve applications and agents. Scouts and workers grow and maintain the same registry. Eve is a worker/orchestration choice, not a prerequisite for browsing or the definition of the company.

The journey is **discover → understand → select → save → acquire → use → learn from the outcome**. Inspiration remains useful, but the product must eventually help people produce working interfaces.


## Product phase map

The numbered product phases below are the strategic product sequence. The engineering gates `R0–R5` later in this document are acceptance gates nested beneath that sequence; they are not competing versions of the roadmap.

| Product phase | Objective | Major product outcome |
| --- | --- | --- |
| **Phase 1 — Registry + Discovery foundation** | Make UIXO a credible, visible, evidence-backed registry for humans and machines | Public discovery, Assets, Sources, Collections, provenance, Registry Intelligence, production activation and **UIXO Discovery V2** |
| **Phase 2 — Agent-scaled registry growth** | Make the registry improve continuously without giving agents editorial authority | Grok discovery, Eve investigation/maintenance, gap queues, freshness work and bounded automated operations |
| **Phase 3 — Search intelligence** | Make UIXO materially better than directory/key-word search | Semantic retrieval, visual similarity, intent understanding, style/use-case metadata and explainable contextual ranking |
| **Phase 4 — UIXO for agents** | Make UIXO infrastructure for software-building agents and coding tools | Mature API/MCP, project-aware asset selection, acquisition/installation workflows, SDKs, quotas and commercial platform access |
| **Phase 5 — Project intelligence + organisation products** | Help people and teams assemble coherent interfaces and learn from outcomes | Personal projects, Teams, private registries, governance, composition/adaptation and evidence-backed outcome intelligence |

### Phase 1 completion: UIXO Discovery V2

**UIXO Discovery V2 is part of Phase 1. It is not a later Phase 2 initiative.** Registry Intelligence V1 built much of the operating spine, but too much of that value is currently hidden behind routes, curator gating and unpublished drafts. Discovery V2 turns that foundation into a product a visitor can actually perceive and use.

The informal description that the foundation is “about 70% done” and that roughly “30% remains” is planning shorthand, not an audited completion percentage. The remaining Phase 1 work is defined by acceptance evidence, not by a numeric progress bar.

Discovery V2 must make the following first-class and visible:

- **Explore:** Assets, Collections and Sources in normal navigation, plus Saved for personal recall.
- **Curator:** Registry Health, Operations, Editorial and Indexing for authorised users.
- **Collections:** publish a deliberately small set of useful starter collections with strong visual cards, ordered assets, notes and source context.
- **Sources:** visual provider profiles with asset counts, frameworks, licence/provenance evidence, preview coverage and verification context.
- **Asset detail:** make provenance, licence, dependencies, source/version evidence and acquisition route easy to understand.
- **Agent entry point:** make “Connect your AI agent” discoverable and explain what UIXO's MCP/API can actually return.
- **Production activation:** run and verify the additive Registry Intelligence migration against the intended persistent environment, verify curator auth, public/private boundaries and production API routes.
- **Release acceptance:** responsive browser acceptance and normal CI must pass; hidden URLs alone do not count as shipped product.

**Phase 1 exit:** a new visitor can discover assets, collections and sources without knowing query parameters; a curator can visibly operate the registry; published collections contain real reviewed records; the persistent registry serves the Intelligence V1 schema; and the same approved records are available consistently through web and MCP/API.

Detailed build scope: [UIXO Discovery V2](UIXO-DISCOVERY-V2.md).

## Products and editions

These share one foundation. Do not build disconnected databases or unrelated shells for each edition.

| ID         | Product / audience                                     | Intended capability                                                                                                                                                  | Decision status                                                  | Current reality                                                                                                            |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| WEB        | Public Web / designers and developers                  | Curated websites, individual asset discovery, real previews, provenance, variants, useful filters, favourites, editorial collections and original acquisition routes | Established direction                                            | Partial and usable on preview; representative source renders and account saves work, while catalogue depth remains limited |
| PRO        | Personal workspace / frequent builders                 | Mixed project boards, project requirements, comparisons, advanced discovery, compatibility guidance, export/acquisition and paid high-value assistance               | Proposed edition; personal saved projects are established scope  | Account-backed website/asset favourites work; no complete mixed project workspace or paid entitlement                      |
| TEAM       | Collaborative workspace / design and engineering teams | Shared projects, roles, comments/decisions, approved sources, private libraries, reusable project constraints and team usage                                         | Proposed edition                                                 | Not implemented as a team product                                                                                          |
| PLATFORM   | API/MCP / coding tools and product integrators         | Search, inspect, preview, compatibility, resolve/acquire; scoped credentials, documented contracts, usage limits and eventual SDK                                    | Core API/MCP established; commercial platform packaging proposed | Nine read-only MCP tools and a shared registry service exist; full external-client journey remains an acceptance gate                   |
| ENTERPRISE | Governed infrastructure / organisations                | Private registries, organisation policies, preferred internal design systems, licence/source restrictions, audit history, SSO and contractual support                | Longer-term proposal                                             | Not an enterprise-ready service                                                                                            |
| OPS        | Internal curator and intelligence workspace            | Scout intake, evidence investigation, indexing, deduplication, review, publication, refresh, job controls and operational visibility                                 | Established direction                                            | Registry Health, Sources, Collections, Operations and Editorial routes/tools exist; visible navigation, production activation and real Grok/Eve acceptance remain incomplete                                    |
| MARKET     | Provider marketplace / creators                        | Provider onboarding, ownership claims, official integrations and potentially authorised sales/licensing with a transaction fee                                       | Later option, not v1                                             | Editorial directory and source links; no marketplace commerce                                                              |

## Application surfaces and navigation

- **Landing:** no sidebar; communicate the product, show useful editorial picks and collections, provide entry into discovery. Do not turn it into an unsupported pricing pitch.
- **Browse shell:** Websites / Assets / Collections at the top; title → view/sort controls → search and appropriate pricing → results. Same interaction conventions across categories, collection detail and saved views.
- **Website/provider detail:** explain the source and editorial rationale; link to its indexed assets without implying every asset is individually curated.
- **Asset detail:** visual preview, variants, dependencies, provenance/licence evidence, save and authorised acquisition. Missing evidence stays explicit.
- **Favourites:** one sidebar section, Websites and Assets beneath it. An eventual All view uses typed items and clear labels; it must not silently mix a provider with one of its icons.
- **Personal projects:** a saved collection of websites and assets plus framework, style and intended outcome. Distinguish these private projects from public editorial Collections.
- **Team/private workspace:** reuse the shell with an explicit workspace boundary and permissions, rather than leaking private results into public discovery.
- **Curator/operations:** role-restricted screens for candidates, evidence, jobs and publication. Operational status must not crowd visitor screens.
- **Developer connection:** setup guidance and credentials appropriate to the client; explain what tools actually do. Returning an install recipe is not executing an installation.

## Shared platform capabilities

| ID       | Capability                      | Scope and boundaries                                                                                                                                                               |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REG      | Canonical registry              | Providers, assets, variants, stable IDs, source/version pins, evidence, licences, freshness, relationships, style/use-case metadata and separate indexed/editorial states          |
| MEDIA    | Preview and evidence storage    | Source-authorised images, real isolated component renders, snapshots and later motion/interactive previews; large files in object storage with registry pointers                   |
| SEARCH   | Discovery and ranking           | Shared web/API/MCP search; deterministic hard filters; aliases, use cases, style and explainable ranking; evaluated semantic/visual retrieval later                                |
| SAVE     | Personal and shared saved items | Typed website/asset membership, guest-to-account migration, ownership, sync/retry/conflict handling, private projects and eventual team permissions                                |
| USE      | Acquisition and compatibility   | Original download/package/registry/purchase routes; preserve notices; verify version/dependency evidence; later project-aware adaptation with explicit changes, tests and rollback |
| INGEST   | Discovery and maintenance       | Preserve Grok GitHub intake; structured candidates, deduplication, evidence, durable jobs, review/publication and freshness workflows                                              |
| ACCESS   | Shared service boundary         | Authentication, authorisation, rate limits, client contracts, scoped API access and MCP; private workspace enforcement before retrieval                                            |
| LEARN    | Quality and outcome data        | Curator judgements, relevance feedback, successful/failed use, corrections and evidence lineage; purpose-limited collection with appropriate rights and privacy                    |
| COMMERCE | Paid workflow infrastructure    | Validated entitlements, usage/cost accounting, billing and limits; sponsored placement stays distinguishable from editorial ranking                                                |
| OPS      | Reliability and governance      | Ordinary PR checks, migrations, environment isolation, logs/alerts, budgets, backups, recovery and tested release acceptance                                                       |

## Grok, Eve and the registry

The proposed operational path is:

**Grok discovery / GitHub issue → structured candidate → investigation job → evidence and proposed revision → curator review → published registry → search/API/MCP.**

A candidate is unapproved input. An event records a change such as candidate-created or indexing-failed. A job is work with durable state, attempts, results and limits. They are related records, not synonyms.

Grok remains the X scout and can later answer structured follow-up research requests. Eve coordinates bounded investigation and maintenance through UIXO APIs. Specialist source, licence, visual and code analysis can be added where it improves results. Neither a scout confidence score nor a successful model response grants editorial approval.

Keep GitHub as the present human-readable intake/audit wrapper; link it to canonical candidate/job IDs. Begin with the existing durable database/job mechanisms. A separate event platform is not a launch requirement. Verify duplicate delivery, retries, cancellation, continuation and publication before adding schedules or autonomous breadth.

## Intelligence evolution: explicitly included, not lost from scope

| ID    | Capability explored in the chats                                                                                      | Delivery position / proof needed                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| INT-1 | Asset understanding: interaction, visual character, category, use case, platform and constraints                      | Enrich evidence-backed metadata; distinguish declared facts from model inference                                        |
| INT-2 | Semantic and visual search; similar assets across providers                                                           | Establish intent-query evaluation set; improve measured relevance while preserving framework/licence/price filters      |
| INT-3 | Contextual ranking: what belongs together and which result fits the project                                           | Compare against keyword baseline using curator choices and actual outcomes; expose reasons and uncertainty              |
| INT-4 | UX judgement: hierarchy, navigation, progressive disclosure, empty/error states, accessibility and mobile conventions | Evaluate against explicit criteria; present suggestions as judgements, not proof of usability                           |
| INT-5 | Composition: select compatible assets, infer a coherent visual language and assemble project building blocks          | Demonstrate one constrained end-to-end project with versioned inputs, usable output and visual/technical QA             |
| INT-6 | Adaptation/generation: reference or screenshot → analysis → component/system/code/page                                | Later opt-in workflow; establish source rights, quality bar, costs, change review and rollback before product claims    |
| INT-7 | Specialised UIXO models: Visual Encoder, Rank, UX Judge, Composer and Design Critic                                   | Research options, not five committed services; pursue only when lawful datasets and evaluation demonstrate an advantage |

No proprietary model training is required to ship the registry or first intelligent workflows. Existing models can assist initially. Collect structured metadata and permitted feedback rather than assuming every indexed asset can be used for training. Track rights separately for indexing, previewing, redistribution and training. A private customer project is not default training material.

## Commercial model and open choices

The conversations propose free/cheap discovery and monetising deeper intelligence, actions, teams and API usage. Personal subscriptions, team plans, platform usage and enterprise contracts are hypotheses to validate. Provider marketplace fees are a later possibility.

Previously discussed $19 Pro, $99 Team and enterprise starting figures are **exploratory examples**, not approved prices, verified willingness to pay or revenue forecasts. Competitor prices from those chats have not been revalidated here and should not be copied into public claims.

Before launching a paid edition, decide:

1. Which successful workflow people will pay for: advanced discovery, project curation, adaptation, acquisition assistance or private governance.
2. What remains free, how account limits work, and which expensive operations consume a budget.
3. Whether Team is priced per workspace, per seat or by usage; which sharing/private features justify it.
4. How API credentials, quotas, revocation, cost tracking and billing failures affect access.
5. Which enterprise needs have actual customer evidence; do not promise SSO/SLA/private ingestion without implementation and support capacity.

Sponsorship must not buy an editorial endorsement or alter undisclosed quality ranking. A purchase route to a third-party asset is not a UIXO marketplace transaction.

## Engineering delivery gates

These gates provide implementation and acceptance evidence beneath the product phase map above. Discovery V2 completes visible and operational portions of **Product Phase 1** while drawing primarily on R0 and R1 requirements.


### R0 — Coherent and reliable current product

Products: WEB, OPS foundations. Capabilities: SAVE, MEDIA, OPS, ACCESS.

- Repair account save reliability and migrate asset saves without losing guest data.
- Preserve the agreed navigation and finish keyboard/mobile/error-state acceptance across all views.
- Deliver real component previews and accurate fallback labels.
- Run normal PR CI, verify operator authentication and separate preview/production data.

**Exit:** saved websites/assets survive account/device changes and failed requests; previews accurately depict the selected asset; critical browsing and save journeys pass; release configuration is reviewed. Existing preview deployment is not completion of this gate.

### R1 — Prove the registry and acquisition loop

Products: WEB, PLATFORM, OPS. Capabilities: REG, INGEST, USE, MEDIA.

- Complete approved-provider indexing beyond the captured seed; prioritise useful sources and categories rather than an arbitrary record count.
- Prove Grok intake → candidate → review → publication, then one bounded Eve job.
- Pin versions and evidence; verify stale/changed source handling.
- Complete one real coding-client MCP journey from query to working asset, with notices retained.

**Exit:** fresh approved records reach web and MCP consistently; retries do not duplicate or bypass review; one acquired asset works in a test project; operators can investigate a failure. Then perform production release acceptance.

### R2 — Personal workflow and first paid value

Products: WEB, proposed PRO. Capabilities: SAVE, SEARCH, INT-1–3, COMMERCE.

- Mixed personal projects, constraints, comparison and export.
- Evaluated intent retrieval and useful project-aware recommendations.
- Validate one paid workflow and its operating costs; implement entitlements and billing only around that concrete value.

**Exit:** a user can select and reuse a coherent project set; retrieval improves against a documented baseline; paid benefits and limits are truthful and testable. Pro naming and prices remain open until validated.

### R3 — Shared workspaces and platform distribution

Products: proposed TEAM, commercial PLATFORM. Capabilities: ACCESS, SAVE, OPS, COMMERCE.

- Shared projects, workspace roles, private sources and audit history.
- Scoped machine credentials, quotas, usage reporting, documentation and external integration acceptance.

**Exit:** membership and revocation are enforced by the API, private assets never leak, a team and an external integration complete representative workflows, and usage accounting reconciles.

### R4 — Governance and composition

Products: proposed ENTERPRISE and advanced PRO/TEAM. Capabilities: INT-4–6, USE, ACCESS.

- Approved-source and licence policies, preferred internal systems and private registries.
- Constrained composition/adaptation with versioned output and reviewable project changes.
- Add SSO, contractual support and other enterprise commitments only against validated requirements.

**Exit:** an organisation policy holds across human and machine access; a scoped composed/adapted result passes visual and technical acceptance; support commitments are operationally credible.

### R5 — Research and ecosystem options

Products: optional MARKET, specialised intelligence models (INT-7).

- Provider partnerships and authorised marketplace economics if demand warrants them.
- Specialised ranking/encoding/judgement models only with rights-cleared data and measured improvement.

**Exit:** validate each investment independently. This phase is not a prerequisite for a successful public product.

## Immediate work packages

The engineering audit is the implementation inventory. These stable IDs connect it to this roadmap:

| Work ID   | Next deliverable                                                         | Gate | Acceptance evidence                                                                            |
| --------- | ------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------- |
| SAVE-01   | **Completed:** safe website-list load/write failure handling             | R0   | Failed initial GET cannot cause a destructive snapshot PUT; pending changes survive retries    |
| SAVE-02   | **Completed:** typed account-backed asset favourites and guest migration | R0   | Cross-device add/remove, account isolation and migration tests; existing saves preserved       |
| MEDIA-01  | **Completed:** representative source-pinned component rendering          | R0   | Five integrity-checked shadcn/ui primitives match gallery/detail views at desktop/mobile sizes |
| OPS-01    | CI and release isolation/auth checks                                     | R0   | Ordinary PR checks, role acceptance, preview database boundary and release runbook             |
| DV2-01     | **Discovery V2 visible information architecture**                        | R0   | Assets, Collections, Sources and Saved are discoverable in normal navigation; curator tools appear for authorised users |
| DV2-02     | **Publish initial editorial asset collections**                         | R0/R1| Reviewed collection cards/details are useful on desktop/mobile and public snapshots stay separate from drafts |
| DV2-03     | **Source Intelligence public experience**                               | R0/R1| Source cards/profiles expose provenance, framework, licence, preview and verification context without invented scores |
| ACT-01     | **Registry Intelligence production activation**                         | R0/R1| 004 migration verified in intended persistent environment; curator auth/private boundaries/API routes pass acceptance |
| REG-01    | Fresh approved-provider indexing                                         | R1   | Source-pinned records, staged review, retry/continuation and published search evidence         |
| INGEST-01 | Grok issue handoff and one Eve run                                       | R1   | Linked issue/candidate/job/review IDs with success and failure traces                          |
| USE-01    | External-client MCP acquisition acceptance                               | R1   | One real asset used successfully with retained source/licence notices                          |
| SEARCH-01 | Intent relevance evaluation and enrichment                               | R2   | Baseline query set, hard-filter tests and measured improvement                                 |
| PRO-01    | Personal mixed projects and first paid workflow validation               | R2   | Tested project journey and evidence for the chosen commercial boundary                         |

## Ownership of truth and maintenance

- This roadmap owns product scope, phase gates and unresolved product decisions.
- The dated engineering audit owns the observed gaps and fixes; refresh it when work packages change.
- STATUS owns verified operational state, not aspirational claims. Original brief and historical changelog entries retain their dates/context.
- Each completed work package records code/PR, tests, live acceptance where applicable and remaining limits. A checked task without evidence is not complete.
- New ideas enter as proposals with dependencies; do not silently expand the current release or discard later scope.

SAVE-01, SAVE-02, MEDIA-01, the inventory-aware discovery work and Registry Intelligence V1 are merged to `main`. The immediate product package is **UIXO Discovery V2 + production activation**, which completes the visible/operational remainder of Product Phase 1 before Phase 2 agent scaling. Account saves, source-backed previews, Registry Intelligence and the nine-tool MCP surface are foundations to expose and validate, not reasons to skip the visitor product.
