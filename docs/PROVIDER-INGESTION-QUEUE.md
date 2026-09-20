# Provider ingestion queue

Updated 20 September 2026. Base main: `7ed44ecdf603d84e11e60735430e6be37a737184`.
Branch: `feat/provider-ingestion-approved-wave`. Do not merge automatically.

## Current delivery state

The explicit queue, source inventory readers, immutable staging capture and 43 local tests are committed on this branch. This is not a claim that the components have been published. No new provider has passed every publication gate. No production database write, merge or deployed preview acceptance has been performed.

The branch-only `Provider ingestion evidence` workflow captures each provider sequentially from its exact SHA, retains permitted evidence and commits only staging snapshots/licences to this branch. It never updates `registry/providers.ts`, publishes an Asset or connects to Neon. Its actual run outcome and counts must be recorded below after verification. A successful inventory capture is not a reviewed publication.

## Product boundaries

`src/content/resources.json` is the website directory. `registry/providers.ts` is the asset ingestion allowlist. Directory membership is not approval. The queue in `tools/provider_ingestion/queue.json` is an explicit audit scope, not a second publication allowlist.

Do not ingest 21st.dev. React Bits remains a website-directory link under the user's Commons Clause exclusion. Do not ingest individual icons. React Native belongs in the separate future queue below.

## Existing providers and counts

These are current source-controlled capture/test counts, not a fresh production database measurement. Preserve existing IDs, names, curator edits and provider revocations.

- shadcn/ui: 53 component records, existing pinned local demos.
- Magic UI: 68 component records, existing local demos and official captures. Seven source-less manifest entries are already excluded.
- Motion Primitives: 33 component records, existing pinned local demos and official captures.
- Simply Buttons: 108 existing records with original local demos. README reuse guidance is not a newly approved standard redistribution licence; permissions remain unknown.
- Animata: 200 existing records with official Storybook embeds.
- Lucide: one pack-level record, `lucide/pack`.
- Heroicons: one pack-level record, `heroicons/pack`.

Total: **464 source-controlled catalogue records**. Existing Lucide/Heroicons mutable-branch evidence and Simply Buttons' non-standard licence guidance are legacy remediation items, not exceptions to the new-provider requirements. Existing saved individual icons are compatibility records, not permission to crawl more glyphs.

## Counts and approval terminology

Expected counts below are observed inventory units, not published assets. Counts marked pending require complete source enumeration. Actual new published count is zero for every provider at this checkpoint. The capture job records actual staged counts separately in `data/registry/snapshots/ingestion/<provider>/<SHA>/staged.json` and its `capture.jsonl` artifact.

The MIT/Apache assessments below cover the root licence text only. For those roots, commercial use and redistribution are permitted subject to the licence notices and conditions. This does not approve inherited code, third-party imagery, external services or a preview. Restrictions and unknown rights remain explicit.

For every provider, the following gates remain mandatory: complete official identity/licence review; installation and dependency evidence; real component preview; strict adapter validation; idempotent scoped database acceptance; and light/dark desktop/narrow browser checks. A missing gate keeps the record unpublished.

## Ordered provider audit

### 1. Kibo UI

Website: https://www.kibo-ui.com/. Repository: https://github.com/shadcnblocks/kibo. Branch: `main`.

SHA: `3d63cdb15b79d972e3dc38a10997987672f9b263`.
Licence: MIT, `license.md`. Commercial use: allowed by root text. Redistribution: allowed with notices; component review pending.
Evidence: https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/license.md.
Exact licence bytes and source/hash evidence are committed under `data/registry/licences/kibo-ui/`.

Expected inventory: 41 packages after removing shared/tooling/pattern directories, before style-only exclusions. Complete component count pending. Actual published: **0**.
Preview: original example plus exact pinned component, locally rendered unless an official isolated route is established. Do not iframe the complete docs page as a component demo.
Installation: package manifests plus the pinned `apps/docs/lib/package.ts` registry transformation. Workspace dependencies need explicit end-user mapping.
Exclusions: shared shadcn primitives, TypeScript tooling, patterns and style-only typography. Risks: example dependency closure, external media and per-component browser acceptance.

- [x] Candidate SHA and root licence evidence recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 2. Dice UI

Website: https://www.diceui.com/. Repository: https://github.com/sadmann7/diceui. Branch: `main`.

SHA: `c6e666943d55011c12cac224803666fdcde5b53e`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; component review pending.
Evidence: https://github.com/sadmann7/diceui/blob/c6e666943d55011c12cac224803666fdcde5b53e/LICENSE.

Expected inventory: 45 Radix UI declarations; 40 Base UI declarations are alternative implementations, not automatically another 40 assets. Actual published: **0**.
Preview: original Radix/Base UI examples, rendered from the matching pinned implementation unless an official isolated route is verified.
Installation: `docs/registry/bases/{radix,base}/ui/_registry.ts`. Extract declarations without executing TypeScript; retain differing dependencies.
Exclusions: hooks, internal helpers and duplicate family identities. Risks: declaration parsing and variant identity need full review; lexical name capture is not complete install evidence.

- [x] Candidate SHA and inventory layout recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 3. UIAble

Website: https://uiable.com/. Repository: https://github.com/codedthemes/uiable. Branch: `master`.

SHA: `34e78586c904091059deb63412ae330b2757e923`.
Licence: MIT, `LICENSE`, community repository only. Commercial use: allowed by root text. Redistribution: allowed with notices; Pro excluded.
Evidence: https://github.com/codedthemes/uiable/blob/34e78586c904091059deb63412ae330b2757e923/LICENSE.

Expected inventory: 707 component variants in `src/components/uiable/registry.json`. The separate 62 primitives and 60 blocks are not included in that count. Actual published: **0**.
Preview: exact official `/preview/<category>/<component>` route derived from the source path. Generated `/preview/<name>` metadata must not be assumed correct. Sandbox/storage behaviour needs browser proof.
Installation: official `@uiable` registry instructions, retained generated item JSON and declared registry dependencies.
Exclusions: Pro products, shared primitive duplicates and separate blocks. Risks: 707-entry inventory requires separate bounded staging, not raising the existing runtime parser's 200-component limit; theme messaging and iframe boot require acceptance.

- [x] Candidate SHA, registry structure and preview route implementation recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 4. Flowbite React

Website: https://flowbite-react.com/. Repository: https://github.com/themesberg/flowbite-react. Branch: `main`.

SHA: `85319bd067822f7aa9670688780aeb58cc187aa5`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; Pro excluded.
Evidence: https://github.com/themesberg/flowbite-react/blob/85319bd067822f7aa9670688780aeb58cc187aa5/LICENSE.

Expected inventory: 46 source directories before internal exclusions. Staging excludes internal Floating and identifies the separate ButtonGroup within Button; final count must be measured. Actual published: **0**.
Preview: official Storybook first, otherwise exact `/examples/<component>.<example>` routes backed by pinned example files. Do not reuse a forms screenshot for unrelated controls.
Installation: retained `packages/ui/package.json`, package peer/dependency declarations and upstream setup docs.
Exclusions: internal primitives, Pro products and unreviewed duplicate examples. Risks: external hosted demos are mutable; theme and viewport support must be tested rather than inferred from HTTP 200.

- [x] Candidate SHA and official isolated example route recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 5. HeroUI Web

Website: https://www.heroui.com/. Repository: https://github.com/heroui-inc/heroui. Branch: `v3`.

SHA: `ac71b5f644803b2107c878908e64f100d6a7d443`.
Licence: Apache-2.0, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed subject to Apache conditions, notices and component review.
Evidence: https://github.com/heroui-inc/heroui/blob/ac71b5f644803b2107c878908e64f100d6a7d443/LICENSE.

Expected inventory: 68 component Storybook files with matching web implementation paths. Actual published: **0**.
Preview: official Storybook matched against its real index and reviewed story IDs; no guessed ID generation. Native demos are not web previews.
Installation: `packages/react/package.json`, declared peers/dependencies and official React setup.
Exclusions: HeroUI Native, Pro products, helper-only docs and unreviewed examples. Risks: the current runtime Provider type only permits main/master and its licence recogniser only handles MIT/ISC. Add explicit reviewed support rather than weakening guards or casting around them.

- [x] Candidate SHA, branch and story source inventory recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 6. Fancy Components

Website: https://www.fancycomponents.dev/. Repository: https://github.com/danielpetho/fancy. Branch: `main`.

SHA: `f9f62c61207b2dd3210476dd98af3c9a5be24094`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; component/media review pending.
Evidence: https://github.com/danielpetho/fancy/blob/f9f62c61207b2dd3210476dd98af3c9a5be24094/LICENSE.

Expected inventory: pending complete enumeration of `src/fancy/components/<category>/*.tsx`. Actual published: **0**.
Preview: the corresponding original `src/fancy/examples` implementation with exact pinned source, or a verified official isolated route.
Installation: per-component docs and source imports. The project package.json is not a claim that every component needs every dependency.
Exclusions: duplicate examples, landing-page artwork, fonts and unreviewed demo imagery. Risks: physics/animation dependencies and external media require isolated execution review.

- [x] Candidate SHA and stable source layout recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 7. EvilCharts

Website: https://evilcharts.com/. Repository: https://github.com/legions-developer/evilcharts. Branch: `main`.

SHA: `500ecd44c1fdcf319ba83ea68f3771bc76125974`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; component review pending.
Evidence: https://github.com/legions-developer/evilcharts/blob/500ecd44c1fdcf319ba83ea68f3771bc76125974/LICENSE.

Expected inventory: 27 registry component entries; 252 registry blocks are a separate scope. Some component entries are chart helpers, not standalone public demos. Actual published: **0**.
Preview: actual Recharts/ECharts examples from matching pinned source. The repository's illustrative SVG chart previews do not prove a real chart render.
Installation: exact registry item dependencies and registryDependencies, with chart engine identity retained.
Exclusions: block-only entries, helpers lacking standalone demos and illustrations offered as live previews. Risks: helper/category mapping, engine-specific runtime and canvas rendering.

- [x] Candidate SHA and registry counts recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 8. Kokonut UI

Website: https://kokonutui.com/. Repository: https://github.com/kokonut-labs/kokonutui. Branch: `main`.

SHA: `83eec6d982d400a18438001a8efdbac1f159dd43`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; component review pending.
Evidence: https://github.com/kokonut-labs/kokonutui/blob/83eec6d982d400a18438001a8efdbac1f159dd43/LICENSE.

Expected inventory: 46 components; exclude four hooks and one library helper. Actual published: **0**.
Preview: real component-specific implementation from `components/kokonutui`, using a verified official demo or pinned local render.
Installation: root registry.json dependencies, supporting files and shadcn registry dependencies.
Exclusions: Pro offerings, helper-only records and standalone icon records. Risks: third-party brand graphics and component demonstrations need separate review.

- [x] Candidate SHA and component/helper split recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 9. MapCN

Website: https://www.mapcn.dev/. Official repository: https://github.com/AnmolSaini16/mapcn. Branch: `main`.

SHA: `d160bd767bc6388618720c6038a4dd9948c97362`.
Licence: MIT code, `LICENSE`. Commercial code use and redistribution: allowed by root text with notices. Basemap service authorisation is separate and unresolved.
Evidence: https://github.com/AnmolSaini16/mapcn/blob/d160bd767bc6388618720c6038a4dd9948c97362/LICENSE.

Expected inventory: recount the official registry; do not reuse the earlier `pacb9148/mapcn` fork inventory or SHA. Actual published: **0**.
Preview: actual MapLibre component with an authorised basemap configuration and visible required attribution, or an official reviewed isolated demo.
Installation: official registry item, MapLibre dependencies and upstream style requirements.
Exclusions: the earlier search-result fork, unauthorised tile-service usage and unrelated page blocks. Risks: CARTO basemap commercial terms are not granted by the MIT component licence; WebGL/worker/CSP behaviour needs acceptance.

- [x] Official-site repository correction and exact SHA recorded.
- [ ] Approved adapter, authorised truthful preview and reviewed publication complete.

### 10. Babelize Elements

Website: https://elements.babelize.co/. Repository: https://github.com/babelize/babelize-elements. Branch: `main`.

SHA: `2cd92ba8acad36e6122d4c528cc81b5d99ffd587`.
Licence: MIT, `LICENSE`. Commercial use: allowed by root text. Redistribution: allowed with notices; component review pending.
Evidence: https://github.com/babelize/babelize-elements/blob/2cd92ba8acad36e6122d4c528cc81b5d99ffd587/LICENSE.

Expected inventory: language-switcher, navbar and phone-input, three source components. Actual published: **0**.
Preview: original docs demos paired with the exact pinned source, or a verified official isolated demo.
Installation: pinned README documents npm `@babelize/elements`, `@elements` registry setup and Tailwind source scanning. Preserve actual installation requirements.
Exclusions: marketing claims about future components, helpers and invented locale-picker records. Risks: registry transformation and demo dependency closure remain to be verified.

- [x] Candidate SHA and corrected official .co domain recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

### 11. Spectrum UI

Website: https://ui.spectrumhq.in/. Repository: https://github.com/arihantcodes/spectrum-ui. Branch: `main`.

SHA: `cdb32064c2d9843dfc7f55da71282fa0ffc719d3`.
Root licence: Apache-2.0, `LICENSE`. Commercial use and redistribution for the complete component collection: **not established**. Root permissions do not resolve inherited code.
Evidence: https://github.com/arihantcodes/spectrum-ui/blob/cdb32064c2d9843dfc7f55da71282fa0ffc719d3/LICENSE.

Expected inventory: 221 component entries, 92 blocks and two hooks. Actual published: **0**.
Preview: none approved; audit ancestry first, then review an original component-specific demo.
Installation: root registry declarations can be staged as evidence, not executed or declared approved.
Exclusions: blocks, hooks, bundled node_modules, restricted inherited sources and unverified notices. Blocker: mixed ancestry includes Aceternity, Magic UI and shadcn; review individual notices and permissions before redistribution.

- [x] Candidate SHA and mixed-ancestry blocker recorded.
- [ ] Per-component rights, truthful previews and reviewed publication complete.

### 12. MicroInteractions UI

Website: https://www.microinteractionsui.com/. Repository: https://github.com/mateusmachry/microinteractionsui. Branch: `main`.

SHA: `95d98ec8de72d1222855f0104f550718bacb1648`.
Licence identifier/path: no component-project licence established in the reviewed source. Commercial use: unknown. Redistribution: unknown.
Evidence: https://github.com/mateusmachry/microinteractionsui/tree/95d98ec8de72d1222855f0104f550718bacb1648.

Expected inventory: 21 components and one helper in src/registry.json. Actual published: **0**.
Preview: none approved pending licence evidence.
Installation: pinned README's CLI example is evidence only, not a redistribution licence.
Exclusions: the library helper and unrelated `.agents/skills/frontend-design/LICENSE.txt`. Blocker: an unrelated skill licence does not license this component project. Obtain an applicable grant before publication.

- [x] Candidate SHA and missing-rights blocker recorded.
- [ ] Applicable licence, truthful previews and reviewed publication complete.

### 13. BadtzUI

Website: https://badtz-ui.com/. Repository: https://github.com/badtzx0/badtz-ui. Branch: `main`.

SHA: `0938aaa25b9ecfc25d95b3c4ce28f1d8f0c1b058`.
Licence: MIT text with an additional restriction, `LICENSE.md`; **not ordinary MIT**. Intended commercial redistribution: not approved. General commercial-use certainty: unknown for this catalogue workflow.
Evidence: https://github.com/badtzx0/badtz-ui/blob/0938aaa25b9ecfc25d95b3c4ce28f1d8f0c1b058/LICENSE.md.
Exact bytes and source/hash evidence are committed under `data/registry/licences/badtz-ui/`.

Expected inventory: 35 UI components, 40 examples and three style/helper entries. Actual published: **0**.
Preview: none approved for catalogue publication.
Installation: registry metadata may be audited, but no automated acquisition or redistribution approval is granted.
Blocker: commercial redistribution requires significant modification; minor modifications or unaltered versions cannot be sold. Do not misclassify the licence from its MIT heading or create modified lookalikes to evade the restriction.

- [x] Exact restriction text and hashes retained; fixture regression verifies refusal.
- [ ] Suitable permission or a separately authorised catalogue arrangement established.

### 14. Tailark

Website: https://tailark.com/. Repository: https://github.com/tailark/blocks. Branch: `main`.

SHA: `8139698115c1341bfd2e3e286c04bb4d8146f472`.
Licence: MIT, `LICENCE.md`, free repository only. Commercial use: allowed by root text. Redistribution: allowed with notices; Pro excluded.
Evidence: https://github.com/tailark/blocks/blob/8139698115c1341bfd2e3e286c04bb4d8146f472/LICENCE.md.

Expected inventory: pending complete free block enumeration across Base/Radix and kit registries. Blocks are staged for scope review, not silently published as generic primitive components. Actual published: **0**.
Preview: official `/view/<registry-name>` matched to the actual free block entry. Preserve kit/base identity.
Installation: review `createRegistryHelpers` output and actual item URLs/dependencies, not guessed registry names.
Exclusions: Pro, page-level products, helper-only components and duplicate identities. Risks: reused logos/media, light-only kits, composite block classification and inherited notices.

- [x] Candidate SHA, free source layout and isolated view route recorded.
- [ ] Approved scope/adapter, truthful previews and reviewed publication complete.

### 15. 8bitcn/ui

Website: https://www.8bitcn.com/. Repository: https://github.com/TheOrcDev/8bitcn-ui. Branch: `main`.

SHA: `898caa5932590ab8ff70f54e3c9aff5b5baa523c`.
Licence: MIT, `license.md`. Commercial use: allowed by root text. Redistribution: allowed with notices; component/media review pending.
Evidence: https://github.com/TheOrcDev/8bitcn-ui/blob/898caa5932590ab8ff70f54e3c9aff5b5baa523c/license.md.

Expected inventory: 56 components. The separate 63 blocks and two pages are not automatically part of the component catalogue. Actual published: **0**.
Preview: original component-specific examples with exact pinned source, retained retro styles and reviewed dependency closure.
Installation: root registry.json, declared shadcn dependencies and supporting CSS files.
Exclusions: blocks/pages until scope review, individual icons and unreviewed game/media/font assets. Risks: inherited component notices, font rights and responsive demo behaviour.

- [x] Candidate SHA and component/block/page split recorded.
- [ ] Approved adapter, truthful previews and reviewed publication complete.

## Link-only and pack-only sources

React Bits: website-directory-only under the user's Commons Clause exclusion. 21st.dev: not ingested. BadtzUI and MicroInteractions UI remain audit/link-only until suitable rights are established. Spectrum UI remains blocked for per-component rights review. No other website becomes approved through this document.

Lucide and Heroicons remain one pack record each. Other icon websites require separate provider approval and one pack-level entry, never a per-glyph crawl.

## React Native future queue

HeroUI Native, Reactix, Native Bloom, RN Neo, Make It Animated and React Native Motion require a visible platform filter, native runtime/preview support and their own source/licence audits. None is included in the web-component ingestion queue.

## Validation and progress

- [x] Read current documentation, provider/preview implementation, tests and database sync workflow.
- [x] Confirm latest main and create a separate branch.
- [x] Record all fifteen candidate source SHAs and known blockers.
- [x] Retain exact Kibo and Badtz licence evidence, verified against upstream Git blob hashes.
- [x] Implement staging-only inventory readers and immutable capture; keep current provider validation unchanged.
- [x] Run 43 local fixture/evidence tests, Python compilation and the ordered queue dry run.
- [ ] Complete and verify real upstream capture for every eligible inventory.
- [ ] Retain actual staged counts and full licence evidence for successful captures.
- [ ] Add approved runtime adapters, real preview support and strict acquisition mappings.
- [ ] Prove provider-scoped database sync against an isolated database, preserving existing records and revocations.
- [ ] Run and record lint, TypeScript, application/registry tests and production build for the final head.
- [ ] Verify every published preview in light/dark modes at desktop/narrow widths.
- [ ] Record final published, excluded and blocked counts in this document and the PR.

Local commands already run:

```sh
python -m unittest discover -s tests/provider_ingestion -v
python -m compileall -q tools/provider_ingestion tests/provider_ingestion
python -m tools.provider_ingestion.capture --plan --all
```

These tests do not constitute UIXO database sync, React runtime, production Neon or browser acceptance. No npm validation result is claimed at this checkpoint. The full application CI remains separate.

## Production database action after merge

**This staging-only change requires no production database action.** Do not run the unscoped `registry:sync` merely to publish these audit records. The existing command updates providers and assets across the catalogue and can overwrite state outside this batch.

A subsequent reviewed publication change must first confirm the exact Vercel production project/deployment SHA and Neon project, branch, database and endpoint. Record the backup and isolation boundary without exposing credentials. Then use a provider-scoped insert-only/reviewed operation that preserves existing names, payloads and revocations, refuses changed existing records, and has tested repeat-run behaviour.

Only after human merge approval and successful deployment should the confirmed production target receive approved records. Verify deployed counts and every real preview afterwards. A source commit, CI capture artifact or HTTP 200 is not production publication or preview acceptance.
