# Provider ingestion queue

Updated 21 September 2026. Base main at start: `7ed44ecdf603d84e11e60735430e6be37a737184`.
Branch: `feat/provider-ingestion-approved-wave`. Pull request: #49. **Do not merge automatically.**

## Current state

UIXO has two separate products and they remain separate:

- `src/content/resources.json` is the editorial website directory.
- `registry/providers.ts` is the approved asset-ingestion allowlist.

A website appearing in the directory does not approve it for asset ingestion.

Production was checked directly on 21 September 2026 and reports **464 assets across 7 providers** using persistent Postgres storage. No provider from this queue has been written to the production database.

The current branch catalogue contains **1,437 source-controlled records across 12 providers**. This branch adds **973 reviewed web assets across five providers**:

| Provider | Branch-ready assets | Upstream SHA | Licence | Truthful preview |
| --- | ---: | --- | --- | --- |
| UIAble | 707 | `34e78586c904091059deb63412ae330b2757e923` | MIT | Exact first-party `uiable.com/preview/...` route |
| Flowbite React | 45 | `85319bd067822f7aa9670688780aeb58cc187aa5` | MIT | Exact first-party isolated `/examples/...` route |
| HeroUI Web | 68 | `ac71b5f644803b2107c878908e64f100d6a7d443` | Apache-2.0 root licence | Exact official v3 Storybook story derived from pinned story source |
| Tailark | 150 | `8139698115c1341bfd2e3e286c04bb4d8146f472` | MIT | Exact first-party `/view/[name]` block renderer |
| Babelize Elements | 3 | `2cd92ba8acad36e6122d4c528cc81b5d99ffd587` | MIT | Exact pinned first-party demo source rendered in UIXO's sandboxed live-demo runner |
| **Total new** | **973** | | | |

These records are branch-ready only. Production publication still requires merge, exact production Neon target verification, provider-scoped sync and deployed browser acceptance.

## Already live providers

The current production API reports **464 assets / 7 providers**. The source-controlled catalogue underlying that production total contains:

- shadcn/ui: 53 component records.
- Magic UI: 68 component records.
- Motion Primitives: 33 component records.
- Simply Buttons: 108 records.
- Animata: 200 component records.
- Lucide: 1 pack-level icon record.
- Heroicons: 1 pack-level icon record.

Lucide and Heroicons remain pack-only. Existing legacy individual icon records, if encountered in saved user state, are compatibility records and are not permission to crawl or publish individual glyphs.

## Ordered provider queue

### 1. Kibo UI

- [x] Official identity verified: https://www.kibo-ui.com/ and `shadcnblocks/kibo`.
- [x] Branch/SHA: `main` at `3d63cdb15b79d972e3dc38a10997987672f9b263`.
- [x] Licence: MIT, `license.md`; retained under `data/registry/licences/kibo-ui/`.
- [x] Stable inventory captured from first-party packages.
- [ ] Publication approved.

Expected inventory: 40 web components after excluding `patterns`, `shadcn-ui`, `typescript-config` and style-only `typography`.
Actual branch-published count: **0**.

Preview strategy: pinned local render from the exact Kibo source unless a component-specific official isolated route is proven.
Installation strategy: upstream package metadata plus Kibo's registry transformation.
Blocker: the reviewed snapshot does not yet prove complete end-user dependency closure or a truthful accepted preview for every record. Kibo does **not** block later providers.

### 2. Dice UI

- [x] Official identity verified: https://www.diceui.com/ and `sadmann7/diceui`.
- [x] Branch/SHA: `main` at `c6e666943d55011c12cac224803666fdcde5b53e`.
- [x] Licence: MIT, `LICENSE`.
- [x] Stable Radix/Base UI registry trees captured.
- [ ] Publication approved.

Expected logical inventory: **45** Radix component identities. Base UI is an alternate implementation family, not another set of duplicate catalogue identities.
Actual branch-published count: **0**.

Preview strategy: matching pinned Radix/Base UI demo rendered from the exact implementation.
Blocker: static dependency extraction and implementation-specific preview mapping are not complete enough to publish without weakening current validation.

### 3. UIAble

- [x] Official identity verified: https://uiable.com/ and `codedthemes/uiable`.
- [x] Branch/SHA: `master` at `34e78586c904091059deb63412ae330b2757e923`.
- [x] Licence: MIT, `LICENSE`; licence text retained.
- [x] Stable inventory: first-party `public/registry-index.json` and component registry.
- [x] Component source, dependencies and registry dependencies retained.
- [x] Truthful preview mapping implemented.
- [x] Runtime adapter implemented.
- [x] Provider-scoped sync covered by idempotence tests.
- [ ] Production database sync and deployed acceptance.

Expected component variants: **707**. The provider's separate 62 primitives and 60 blocks are deliberately not ingested in this wave.
Actual branch-published count: **707**.

Preview: exact official isolated route derived from the pinned component source path.
Installation: `https://uiable.com/r/<component>.json`.
Exclusions: Pro products, 62 shared primitives and 60 blocks.

### 4. Flowbite React

- [x] Official identity verified: https://flowbite-react.com/ and `themesberg/flowbite-react`.
- [x] Branch/SHA: `main` at `85319bd067822f7aa9670688780aeb58cc187aa5`.
- [x] Licence: MIT, `LICENSE`; Pro is excluded.
- [x] Package/source inventory captured.
- [x] Exact isolated examples mapped.
- [x] Runtime adapter implemented.
- [ ] Production database sync and deployed acceptance.

Expected source component inventory after internal exclusions: **46**.
Actual branch-published count: **45**.

Preview: exact first-party `flowbite-react.com/examples/<example>` route.
Installation: `flowbite-react` package with upstream peer-dependency evidence.
Exclusions: internal `Floating` primitive; `DarkThemeToggle` remains unpublished because no unique truthful isolated upstream demo was established.

### 5. HeroUI Web

- [x] Official identity verified: https://www.heroui.com/ and `heroui-inc/heroui`.
- [x] Branch/SHA: `v3` at `ac71b5f644803b2107c878908e64f100d6a7d443`.
- [x] Root licence: Apache-2.0, `LICENSE`.
- [x] Web-only Storybook inventory captured.
- [x] Exact Storybook IDs derived from pinned source, not guessed.
- [x] Runtime adapter implemented.
- [ ] Production database sync and deployed acceptance.

Expected web component stories: **68**.
Actual branch-published count: **68**.

Preview: official `storybook-v3.heroui.com/iframe.html` with the story ID parsed from each pinned `.stories.tsx` file.
Installation: `@heroui/react` with retained upstream peer dependencies.
Exclusions: HeroUI Native and other non-web products.
Risk note: the pinned repository root is Apache-2.0 while package metadata still contains older MIT metadata. Both are permissive, but UIXO records the root licence controlling the reviewed repository revision rather than hiding the mismatch.

### 6. Fancy Components

- [x] Official identity verified: https://www.fancycomponents.dev/ and `danielpetho/fancy`.
- [x] Branch/SHA: `main` at `f9f62c61207b2dd3210476dd98af3c9a5be24094`.
- [x] Licence: MIT, `LICENSE`.
- [x] Stable source inventory captured.
- [ ] Truthful preview acceptance.
- [ ] Publication approved.

Expected component inventory: **45**.
Actual branch-published count: **0**.

Blocker: the provider has first-party examples but no isolated public component route was established. Publishing requires vendoring and browser-testing the exact pinned component/example source, including physics/media dependencies. No generic screenshot or recreated animation is accepted.

### 7. EvilCharts

- [x] Official identity verified: https://evilcharts.com/ and `legions-developer/evilcharts`.
- [x] Branch/SHA: `main` at `500ecd44c1fdcf319ba83ea68f3771bc76125974`.
- [x] Licence: MIT, `LICENSE`.
- [x] First-party registry captured.
- [ ] Truthful per-component preview acceptance.
- [ ] Publication approved.

Expected component inventory: **27** `registry:component` entries. **252** `registry:block` examples are outside this component wave.
Actual branch-published count: **0**.

Blocker: chart helpers and chart components have many exact first-party example files, but no safe isolated route covering every component has been proven. The repository's illustrative SVG previews are not substitutes for actual chart renders. Local pinned rendering remains the acceptable path.

### 8. Kokonut UI

- [x] Official identity verified: https://kokonutui.com/ and `kokonut-labs/kokonutui`.
- [x] Branch/SHA: `main` at `83eec6d982d400a18438001a8efdbac1f159dd43`.
- [x] Licence: MIT, `LICENSE`.
- [x] First-party registry captured.
- [ ] Truthful isolated/local previews completed.
- [ ] Publication approved.

Expected inventory: **46** components.
Actual branch-published count: **0**.
Exclusions: 4 hooks and 1 lib helper.

Blocker: docs exist per component, but no component-specific isolated public renderer was established. Exact pinned local rendering is required before publication.

### 9. MapCN

- [x] Official identity corrected to https://www.mapcn.dev/ and `AnmolSaini16/mapcn`.
- [x] Branch/SHA: `main` at `d160bd767bc6388618720c6038a4dd9948c97362`.
- [x] Code licence: MIT, `LICENSE`.
- [x] Registry captured.
- [ ] Basemap/service terms cleared.
- [ ] Publication approved.

Expected atomic component inventory in the current component scope: **1** (`map`). Eight block records remain outside the atomic component wave.
Actual branch-published count: **0**.

Blocker: MIT covers the source code, not automatically CARTO or other basemap/tile services. A truthful live MapLibre preview must use authorised tiles and preserve attribution before UIXO publishes it.

### 10. Babelize Elements

- [x] Official identity verified: https://elements.babelize.co/ and `babelize/babelize-elements`.
- [x] Branch/SHA: `main` at `2cd92ba8acad36e6122d4c528cc81b5d99ffd587`.
- [x] Licence: MIT, `LICENSE`.
- [x] Exact registry metadata retained.
- [x] Exact first-party demos vendored unchanged and SHA-256 locked.
- [x] Sandboxed local preview manifest implemented.
- [x] Runtime adapter implemented.
- [ ] Production database sync and deployed acceptance.

Expected inventory: **3**.
Actual branch-published count: **3**.

Assets: Language Switcher, Phone Input and NavBar.
Preview: exact pinned first-party demo source rendered by UIXO's existing sandboxed live-demo runner.
Installation: official `https://elements.babelize.co/r/<name>.json` registry item with upstream dependencies and absolute registry-dependency URLs.

### 11. Spectrum UI

- [x] Official identity verified: https://ui.spectrumhq.in/ and `arihantcodes/spectrum-ui`.
- [x] Branch/SHA: `main` at `cdb32064c2d9843dfc7f55da71282fa0ffc719d3`.
- [x] Root licence: Apache-2.0.
- [x] Registry inspected.
- [ ] Rights review complete.
- [ ] Publication approved.

Expected registry component-shaped records: **221** plus 92 blocks and 2 hooks.
Actual branch-published count: **0**.

Blocker: mixed inherited ancestry includes external component sources. The root Apache licence is not proof that every inherited component can be redistributed under that licence. The strict staging parser also surfaced non-conforming names that require manual review. UIXO does not weaken validation to force these through.

### 12. MicroInteractions UI

- [x] Official identity verified: https://www.microinteractionsui.com/ and `mateusmachry/microinteractionsui`.
- [x] Branch/SHA: `main` at `95d98ec8de72d1222855f0104f550718bacb1648`.
- [x] Registry inventory captured.
- [ ] Applicable project licence established.
- [ ] Publication approved.

Expected component inventory: **21**; one lib helper excluded.
Actual branch-published count: **0**.

Blocker: no applicable project licence is present. An unrelated licence inside an agent/skill directory does not license the component project.

### 13. BadtzUI

- [x] Official identity verified: https://badtz-ui.com/ and `badtzx0/badtz-ui`.
- [x] Branch/SHA: `main` at `0938aaa25b9ecfc25d95b3c4ce28f1d8f0c1b058`.
- [x] Licence text retained.
- [x] Registry captured.
- [ ] Redistribution approved.
- [ ] Publication approved.

Expected UI component inventory: **35**; 43 style/example/helper records excluded.
Actual branch-published count: **0**.

Blocker: its licence contains MIT text plus an additional commercial redistribution/sale restriction requiring significant modification. UIXO will not represent that as ordinary MIT or redistribute the catalogue automatically.

### 14. Tailark

- [x] Official identity verified: https://tailark.com/ and `tailark/blocks`.
- [x] Branch/SHA: `main` at `8139698115c1341bfd2e3e286c04bb4d8146f472`.
- [x] Licence: MIT, `LICENCE.md`.
- [x] Six Base/Radix registry sources statically parsed without executing upstream code.
- [x] Public installer and isolated renderer proved.
- [x] Runtime adapter implemented.
- [ ] Production database sync and deployed acceptance.

Expected raw inventory: **300** declarations, comprising 150 Base blocks plus 150 Radix mirrors.
Actual branch-published count: **150** logical Base blocks.

Preview: exact `https://tailark.com/view/<name>` renderer.
Installation: exact `https://tailark.com/r/<name>.json` Base registry item.
Exclusion: the 150 Radix declarations are retained as alternate implementations but not published as duplicate assets because Tailark's public installer and view routes resolve the Base catalogue.

### 15. 8bitcn/ui

- [x] Official identity verified: https://www.8bitcn.com/ and `TheOrcDev/8bitcn-ui`.
- [x] Branch/SHA: `main` at `898caa5932590ab8ff70f54e3c9aff5b5baa523c`.
- [x] Licence: MIT, `license.md`.
- [x] Registry captured with retro styles and dependency declarations.
- [ ] Truthful preview coverage completed.
- [ ] Publication approved.

Expected component inventory: **56**.
Actual branch-published count: **0**.
Exclusions: **65** block/page records in this wave.

Blocker: docs and several first-party demos exist, but not a unique isolated truthful preview for all 56 components. Publication requires exact pinned local renders while preserving the provider's retro stylesheet and dependency closure.

## Link-only and excluded sources

- **React Bits** remains a website-directory link only. Its Commons Clause condition makes component redistribution unsuitable for UIXO's asset catalogue.
- **21st.dev** is not ingested. This work does not convert directory membership into provider approval.

## Pack-only icon sources

- Lucide: one provider-level icon-pack record only.
- Heroicons: one provider-level icon-pack record only.
- No new individual icon records are created.

## React Native future queue

These remain outside the web-component catalogue until UIXO has a visible platform filter and Native-specific preview/install handling:

- HeroUI Native
- Reactix
- Native Bloom
- RN Neo
- Make It Animated
- React Native Motion

## Runtime and sync safeguards

New reviewed providers use immutable source snapshots and exact commit SHAs. Existing provider IDs are not renamed. Provider sync is now scoped:

`npm run registry:sync-provider -- <provider-id>`

The scoped command is idempotence-tested and does not touch unrelated providers. Do not use the global sync merely to publish one provider.

Production database action remains **required after merge**, one provider at a time, only after confirming the Vercel production deployment and its exact Neon project/branch/database/endpoint. The intended order is UIAble, Flowbite React, HeroUI Web, Babelize Elements and Tailark, with verification after each provider.

## Validation

Source-evidence staging:

- `python -m unittest discover -s tests/provider_ingestion -v`: 43 provider-ingestion tests.
- `python -m compileall -q tools/provider_ingestion tests/provider_ingestion`.
- Immutable source capture is repeatable and records zero publication during evidence collection.

Application acceptance required before merge:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run typecheck`
- Registry/MCP verification
- live-demo source-lock verification and build
- production build
- isolated browser acceptance at desktop and narrow widths

The PR must not be merged until the current head passes those checks. After merge and provider-scoped production sync, verify each new provider on the deployed site in both light and dark modes and at desktop and narrow widths. A provider that fails its truthful preview stays unpublished.
