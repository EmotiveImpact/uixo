# UIXO status

Updated 19 September 2026.

## Current outcome

**Discovery V2 is implemented and its isolated release checks pass. Product Phase 1 production
acceptance remains open.** Implementation is tracked in [PR #36](https://github.com/EmotiveImpact/uixo/pull/36).
The [master roadmap](PRODUCT-ROADMAP.md) owns product scope. [Discovery V2](UIXO-DISCOVERY-V2.md)
is the completion package within Phase 1, not a separate later phase. The
[release ledger](PHASE-1-RELEASE.md) records the remaining operational gates.

Registry Intelligence V1 was merged through PR #34 at
`812f29c4d27df1138490361b62a171732386d530`; the Phase 1 roadmap was merged through PR #35.
The current work exposes that foundation in the ordinary UI and repairs the failing browser path.
Code, evaluation data and a production-verified service are distinct states.

## Implemented product

The existing React shell now has visible All assets, Asset collections, Sources and Connect your
AI agent navigation. Website and asset favourites remain separately typed. Authorised curators
can navigate to Registry health, Operations, Editorial and Indexing without knowing secret URLs.

Unfiltered Assets includes featured editorial collections. Collection cards and ordered detail
views use previews of their real member components, with source, framework and editorial context.
Sources has searchable provider cards, indexed counts, recorded preview/licence/source-pin coverage
and verification dates. Asset detail exposes source references, declared dependencies, licence
links and a source profile. Missing evidence remains explicit rather than a fabricated score.

Six starter selections are defined in `shared/starter-collections.ts`: Dashboard foundations,
Considered forms, Navigation essentials, Feedback and status, Overlays and dialogues, and
Purposeful motion. The bundled evaluation registry has 264 discovery records from six approved
providers. These are bundled/test counts, not newly measured production counts.

Collection state depends on the environment:

- Read-only evaluation snapshots include the release-authored selections and identify themselves
  as evaluation data. Snapshot bootstrap cannot target persistent storage.
- Persistent curators can prepare missing starter drafts. This publishes nothing and skips
  selections with unavailable members. Existing editorial work is preserved.
- Publication is an explicit reviewed action. Draft edits do not replace the live snapshot;
  withdrawn assets and revoked providers are withheld from public collection and MCP responses.

The public API includes a batched source directory and release/build/schema-readiness information.
Readiness checks do not migrate. The nine read-only MCP tools share the same published registry.
Acquisition returns instructions, not execution or a certified installation.

## Completed isolated verification

The first full green Discovery V2 run is
[CI 35457716698](https://github.com/EmotiveImpact/uixo/actions/runs/35457716698), for head
`1e5a07f7517d488d0d04e847857f65ad49cade14`. Subsequent commits include final cover sizing and this
status update; consult the final PR head checks before merging or promoting a deployment.

That run passed:

- 192 application tests across 27 files, 56 registry/API/Eve tests and the official MCP integration.
- Formatting, lint, TypeScript, production build and 277 prerendered pages.
- Verification of 262 live-demo entries, 568 retained source files, five pinned primitive previews
  and 147 official captures plus 115 live-only demos.
- Eight browser surfaces at 1440px and 390px: Assets, Health, Sources, Source profile, Collections,
  Collection detail, Operations and Editorial. All 16 screen checks had no horizontal overflow or
  application alerts; the run recorded no page errors or failed registry requests.
- Actual visible navigation, source search, six real collection cards, starter draft preparation
  and fixture publication, a genuine local draft save, unchanged public snapshots and guest denial.
- Real preview boot checks for shadcn/ui, Magic UI and Motion Primitives.
- A separate HTTP/MCP network client calling all nine tools, comparing web/API/MCP responses and
  confirming unauthorised private reads are denied.

Browser JSON, screenshots and complete logs are retained in the run's
`intelligence-browser-35457716698` artifact. The browser uses a real local registry and an issued
opt-in development cookie, but a simulated frontend account identity. This is not Neon sign-in,
production PostgreSQL or an external coding-project installation test.

## Browser and preview defects repaired

The development page canonicalises to `localhost`; earlier fixtures issued their host-only cookie
at `127.0.0.1`. The development registry proxy now bootstraps the session on the canonical browser
hostname. Production authorisation was not weakened.

The local preview middleware intercepted Vite's source manifest import and returned a 404 before
the application could boot. That exact source import now remains with Vite. Generated live demos
also use module-relative chunk URLs so a provider media base cannot redirect UIXO's lazy JavaScript
and CSS to an upstream host. Browser acceptance now exercises these failures rather than masking
them. Test pacing respects the unchanged registry rate limit.

## Production release gates still open

The Vercel connector returned 403 for the actual UIXO team scope,
`emotiveimpact-gmailcoms-projects`. Neon access was offered for connection but not established.
No production credentials, schema migration, editorial publication, real identity change or hosted
agent activation were performed by this build.

To close Phase 1, restore the intended service access and record these proofs:

1. Select an isolated preview database and back up the intended persistent registry; apply and
   verify the additive `004-intelligence` migration without changing existing saves or audit data.
2. Review and publish real collections in that environment. Verify actual visitor/member/curator
   sessions, scoped scout/worker boundaries, account persistence and curator mutation success.
3. Run `npm run registry:verify-release -- <origin> --require-persistent`, then production-origin
   browser and recovery acceptance against the exact deployment commit.
4. Complete the remaining R1 operational proofs: fresh source indexing through review/publication,
   duplicate/retry/cancellation handling, one structured scout handoff and bounded Eve job, and one
   coding-client acquisition used in a working project with source notices retained.

A separate Grokbot harvest updated the legacy candidate ledger on main during this build. That is
not evidence that the new structured GitHub-to-registry workflow or hosted Eve is activated.

## Limits and historical context

Semantic/visual retrieval, broad autonomous maintenance, private/team projects, enterprise controls
and project composition remain later roadmap work. Current search is deterministic keyword-based.
Source pins and dependency declarations are not security, accessibility or runtime certifications.
Existing dependency-audit and large-demo-bundle warnings are not claimed fixed by this release.

Earlier 67/168-record, three/five-provider and six-tool figures in historical documents refer to
previous integration snapshots. The dated [12 September audit](PRODUCT-AUDIT-2026-09-12.md),
[Registry Intelligence V1 notes](REGISTRY-INTELLIGENCE-V1.md), changelog and Git history preserve
that context. They must not be substituted for the current release evidence above.
