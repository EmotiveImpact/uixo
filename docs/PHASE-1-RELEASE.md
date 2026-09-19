# Phase 1 release acceptance

Updated 19 September 2026. Implementation: PR #36, `build/discovery-v2-phase1`.
This is the acceptance ledger for [Discovery V2](UIXO-DISCOVERY-V2.md), within
[Product Phase 1](PRODUCT-ROADMAP.md). A merged source release is not a signed-off production launch.

## Delivered product surfaces

The shared sidebar now exposes All assets, Asset collections, Sources and Connect your AI agent.
Website and asset favourites remain separately typed. Authorised asset-workspace curators also see
Registry health, Operations, Editorial and Indexing. Private API permissions are not weakened.

Unfiltered Assets shows a featured collection selection and MCP connection entry. Collections use
real member-component previews, source/framework context and ordered editorial notes. Source cards
have searchable names, frameworks and licences, plus recorded preview, pin and licence coverage.
Asset details expose source references, declared peer versions, related registry dependencies and
links to original evidence. No quality score or runtime certification is invented.

Six source-backed starter selections are defined in `shared/starter-collections.ts`: Dashboard
foundations, Considered forms, Navigation essentials, Feedback and status, Overlays and dialogues,
and Purposeful motion. Membership is validated against approved published assets.

## Three different collection states

**Read-only evaluation:** snapshot bootstrap loads release-authored public selections alongside the
existing captured catalogue. It cannot target persistent storage and it does not grant visitor or
agent publication permissions. The interface labels this mode as an evaluation catalogue.

**Persistent draft preparation:** the curator's Prepare starter drafts action, or
`npm run registry:db -- collections-seed`, creates only missing drafts. It skips selections whose
members are unavailable. Nothing is published; existing editorial work is not overwritten.

**Persistent publication:** a curator reviews and explicitly publishes each draft. The optional
`collections-publish-new --publish-reviewed` operator command publishes only entirely new slugs;
it never overwrites an existing draft, publication or withdrawal. It requires `UIXO_OPERATOR_ID`
and `UIXO_EDITORIAL_REASON`. These values are operator assertions, not credentials or proof that
an editorial review happened. Use the editor for existing drafts.

Published collection reads, including previews and MCP results, withhold withdrawn assets and
revoked providers. Draft edits remain separate from the published snapshot.

## Verification layers

Normal CI runs formatting, lint, application tests, registry/operator tests, official MCP protocol
integration, source-preview verification, TypeScript and the production build. Browser and network
acceptance are additional required steps, not replacements for these checks. Current results and
screenshots are attached to the corresponding Actions run; consult the exact PR head.

`tests/browser/intelligence.py` uses a real isolated in-memory registry, a randomly issued local
curator cookie and simulated frontend account identity. It exercises eight surfaces at desktop
and mobile widths, visible navigation, source search, collection cards, a real draft save and guest
access denial. It is not production Neon sign-in acceptance. The canonical development hostname
is `localhost:3000`; the Vite registry proxy keeps its host-only cookie on that same hostname.

`npm run registry:verify-release -- <origin>` is a separate read-only network client. It checks
schema readiness, public records, private-read denial and parity between HTTP API responses and
all nine MCP tools. It does not migrate, publish, install code or certify runtime compatibility.
CI must propagate its failing exit status even when output is piped to a log file.

The status API returns `release`, `build` and `intelligence.ready` so an old deployment or missing
schema cannot be mistaken for an empty catalogue. Readiness checks table presence without writing.

## Production activation gates still requiring evidence

1. Restore Vercel access to the actual UIXO team/project and connect the intended Neon database.
   Select a separate preview branch and record the environment boundary. Never paste credentials
   into issues, code, screenshots or this document.
2. Back up the intended persistent registry. Inspect and apply `004-intelligence.sql` using the
   documented explicit migration command. Confirm existing assets, saves and audit history survive.
3. Review and publish the starter selections in that environment. An empty persistent catalogue
   is not repaired by swapping it silently to a read-only snapshot.
4. Verify genuine signed-in visitor/member/curator identities, scoped scout/worker denials,
   account save persistence and curator mutation success. Frontend identity fixtures do not close
   this gate.
5. Run `npm run registry:verify-release -- <verified-origin> --require-persistent`. Record the
   deployment commit, schema readiness, counts and web/MCP parity. Repeat browser acceptance on
   the actual release origin, including keyboard, back/forward and small-screen behaviour.
6. Record the remaining R1 proofs: a fresh approved-source indexing/review/publication run,
   duplicate/retry/cancellation behaviour, one real structured scout handoff and bounded Eve job,
   and one coding-client acquisition used in a working project with source notices retained.
   Broad autonomous operation remains Phase 2; a unit fixture is not this operational proof.
7. Review production errors and recovery steps before declaring Phase 1 closed.

## Access blocker observed during this implementation

The connected Vercel account returned 403 for team `emotiveimpact-gmailcoms-projects`, including
protected deployment access. The Neon plugin was offered for connection but database access was
not established. No production migration, real identity change or hosted agent activation was
performed by this source build. These are explicit open release gates, not completed work.

## Rollback and scope

Rollback application code to the previous known deployment when necessary. Preserve additive
intelligence tables and audit history; do not drop them as a routine rollback. Existing starter
slugs and curator decisions are never reset by the new publication command.

Semantic/visual search, broad agent schedules, specialised models, private/team projects and
enterprise governance remain later roadmap phases. The known dependency-audit and large-demo
bundle warnings must be assessed independently; build success does not certify security.
