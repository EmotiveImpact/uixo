# Registry Intelligence V1

## Delivery contract

Build on merged PR #31, preserving the current website directory and shared React shell.
Coverage and source intelligence report stored evidence, never invented upstream changes.
Collections are editorial, typed asset/provider selections with private drafts and separately
published snapshots. Operations connect scout candidates to approved providers, durable jobs,
exact review revisions and current publication state. Scouts and Eve cannot publish.

## Implementation sequence

1. Additive migration, shared contracts and deterministic evidence reporting.
2. Revision-checked collections with explicit editorial publication.
3. Candidate/provider/job/revision lineage and cancellation-safe job completion.
4. Opt-in structured GitHub issue intake with stable IDs and duplicate handling.
5. Shared-shell Health, Sources, Collections and Operations screens.
6. Read-only MCP collection/source tools and bounded Eve operator tools.
7. Unit, API, UI and official-client tests; production build; PR and release evidence.

## Release constraints

Persistent migrations and collection seeding are explicit operator commands. Public requests
never migrate, seed, publish or automatically index. Preview must use a separate database.
Grok intake requires an approved-author allow-list, trusted API origin and scoped scout token.
No schedule or model spend is enabled. New provider adapters still require code/source review.

## Measurement policy

Fresh means verified within 30 days; ageing means 31 to 90 days; stale means older than 90 days.
Missing, invalid and future dates are unknown. These are configurable-product-policy constants,
not claims that an upstream asset is broken. A thin component category has fewer than 5 assets.
A commit pin, a preview record and licence evidence are distinct from security or compatibility
certification. Source metadata is untrusted data, never executable agent instructions.

The synchronous coverage budget is 10,000 assets. Larger reports fail explicitly and can be
requested per provider rather than silently sampling. Collections hold at most 48 typed items.

## Implemented surfaces

Everything lives in the existing `/browse/assets` shell; the original website directory and
website collections remain intact. These paths are URL-backed, including selected sources,
collections and candidates.

| Route                                                | Audience | Behaviour                                                                |
| ---------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `?view=sources`                                      | Public   | Approved provider catalogue                                              |
| `?view=sources&provider=shadcn`                      | Public   | Provenance, media, freshness, dependency and licence evidence            |
| `?view=collections`                                  | Public   | Published editorial asset collections only                               |
| `?view=collections&collection=dashboard-foundations` | Public   | Ordered typed items, notes, inspect and save available assets            |
| `?view=health`                                       | Curator  | Coverage, evidence gaps, freshness and shared source locators            |
| `?view=operations`                                   | Curator  | Discovery stages, linked jobs, errors and revision outcomes              |
| `?view=operations&candidate=<uuid>`                  | Curator  | Candidate/source link, investigation, revision inspection and decisions  |
| `?view=collection-editor`                            | Curator  | Create, search, order, annotate, save and explicitly publish collections |

Private browser routes require a curator session. API permissions are independently enforced;
hiding navigation is not the authorisation boundary. Existing source review, scout and job
utilities remain reachable rather than being replaced with a disconnected application.

Collection drafts and published snapshots are separate. Editing a live collection cannot change
what a visitor sees until a new publication decision succeeds. Expected-revision checks reject
concurrent stale writes. The editor retains unsaved changes on failure and disables editing during
an in-flight mutation. Withdrawn assets or revoked providers are dynamically withheld from public
collections, including MCP responses. Availability is resolved in batches, not one remote query per
item. Collections are curated selections, not certified installation bundles or personal projects.

## API permissions

All operations use `/api/registry?action=<action>`. Existing origin, request-byte and rate limits
remain in force. Read-only snapshots reject mutations even when a valid operator is supplied.

| Actions                                                     | Method | Allowed roles                   |
| ----------------------------------------------------------- | ------ | ------------------------------- |
| `source-health`, `collections`, `collection`                | GET    | Visitor and authenticated roles |
| `coverage`, `operations`, `candidate`, `revision`           | GET    | Curator, worker                 |
| `collections-editor`, `collection-editor`                   | GET    | Curator only                    |
| `collection-save`, `collection-publish`, `candidate-update` | POST   | Curator only                    |
| `candidate-investigate`, `cancel`                           | POST   | Curator, worker                 |
| `scout-github`                                              | POST   | Scout, curator                  |

`coverage` optionally accepts `provider`; `source-health` requires it. Collection detail uses
`slug`; candidate and revision detail use `id`. Collection and operations list routes accept
`limit` (1 to 48) and `offset`; operations also accepts `stage`. Draft saves use `expectedRevision`.
Candidate decisions use `expectedRevision`, a reason and `link`, `reject` or `reopen`. Linking an
approved provider is curator-only; workers cannot approve arbitrary newly discovered hosts.

Investigation creates a candidate-linked durable job. Every staged or deduplicated revision is
recorded against that exact job. Continuation requires a linked completed job with a retained
source reference and next offset. Rejected, cancelled, active and currently published states are
computed from linked evidence, not from a fabricated linear progress counter. Cancellation changes
lease ownership so a returning worker cannot overwrite the cancelled result. Assets staged just
before cancellation remain reviewable and are never silently published. Existing standalone jobs
remain visible but do not acquire invented discovery provenance.

## Grok issue contract

Use one `uixo-candidate` fenced JSON block, with `schemaVersion: 1`. This is data, not an executable
instruction or a publication request. The following is an example, not a production submission:

````markdown
```uixo-candidate
{
  "schemaVersion": 1,
  "name": "Example component source",
  "url": "https://example.com/",
  "reason": "Investigate its original components and retained licence evidence.",
  "creator": "Example creator",
  "suggestedCategory": "Components",
  "discoveredAt": "2026-09-19T12:00:00Z"
}
```
````

Optional `sourcePost` is an HTTPS source post URL. Unknown fields, multiple blocks, malformed
identities and requested approval fields are rejected. The issue must have the `uixo-candidate`
label, belong to the configured repository and be authored by an allow-listed login.

The workflow posts an idempotent candidate receipt to the same issue. Canonical URL deduplication
and immutable issue-to-candidate identity are enforced in the registry. Changed issue text is a
new immutable delivery; it cannot silently retarget an existing issue to another candidate,
replace editorial decisions or grant publication. Historical free-text scout issues are not
silently interpreted as this contract. A scout must add a reviewed structured block to opt in.

The workflow is **disabled by default**. After deploying and verifying the persistent API, set:

- Repository variable `UIXO_SCOUT_INTAKE_ENABLED=true`.
- Repository variable `UIXO_API_ORIGIN` to the intended trusted HTTPS registry origin, with no path.
- Repository variable `UIXO_SCOUT_GITHUB_LOGINS` to a comma-separated approved-author allow-list.
- Repository secret `UIXO_SCOUT_TOKEN` to the registry's scoped scout token, never a curator token.
- Registry environment `UIXO_SCOUT_GITHUB_REPOSITORY` when using a repository other than
  `EmotiveImpact/uixo`.

No value was configured or activated by this source-code build. No GitHub token, database URL or
service secret belongs in an issue, browser bundle or committed documentation. Failed receipt
posting can be retried: intake is idempotent and remains unpublished.

## Eve and MCP

Eve gains six tools: `read_registry_health`, `read_operations`, `inspect_candidate`,
`inspect_revision`, `investigate_candidate` and `cancel_indexing`. They reuse the fixed-origin
worker client, response-byte budget, request timeouts and existing bounded job engine. Eve has
no collection publication, asset approval, arbitrary HTTP, SQL or shell action. Source/issue
text is evidence to inspect, not authority to expand a job's scope. Model hosting, SDK deployment,
secrets, schedules and a real authenticated Eve run remain separate acceptance gates.

The official MCP surface now has nine read-only tools. The three additions are
`get_source_health`, `list_asset_collections` and `inspect_asset_collection`. Collection drafts
and unapproved source targets are excluded. Acquisition still returns a recipe, not an installer.

## Migration and deployment

`004-intelligence.sql` is additive and repeatable. It creates candidate work, candidate/job/revision
links, GitHub deliveries/issue identities and editorial collection tables. Existing registry rows,
user lists and user asset saves are not rewritten. The migration and evidence manifests are
explicitly packaged into both Vercel functions. Persistent runtime requests do **not** migrate.

First validate on a dedicated preview database, not the historical shared preview/production
Neon database. Back up production and review the SQL before approving any production write.
These commands describe explicit operator steps, not work already run against production:

```sh
# Local isolated SQLite validation, no remote environment variables:
npm run registry:db -- migrate
npm run registry:db -- seed
npm run registry:db -- collections-seed

# Only after selecting the correct isolated remote database in UIXO_DATABASE_URL:
npm run registry:db -- migrate --allow-remote
npm run registry:db -- collections-seed --allow-remote
```

`collections-seed` creates three starter **drafts**, only when their original asset references are
available. It does not publish. Do not confuse this with `sync`, which has existing catalogue
publication behaviour and is outside this increment's deployment procedure.

After migration/deployment, verify public source health, absent private draft access, member/worker/
scout denials, curator draft save and publication, a duplicate scout delivery, linked investigation,
revision rejection/approval, cancellation and continuation. Confirm the nine MCP tools through an
external client. Roll back application code if needed; preserve additive tables and audit history
rather than dropping production evidence as a routine rollback.

## Verification and limitations

Local verification currently passes 181 application tests, 49 registry/API/operator tests, the
nine-tool official MCP integration, typecheck, lint and formatting. The locked-dependency build
constituents pass: 262 live demos/568 source files, five pinned primitive sources, 147 official
captures plus 115 live-only demos, Vite and 277 prerendered pages. These are bundled/test counts,
not a claim that production has just been seeded. Existing large demo chunk and optional asset
warnings are not silently reclassified as failures or fixed by this feature.

Browser acceptance is committed under `tests/browser/intelligence.py` and runs in CI against a
fresh in-memory registry. It checks seven surfaces at desktop/mobile widths, errors/overflow,
a real local draft-save with public-snapshot separation, guest route denial and the HTTP permission
boundary. It deliberately simulates identity and account APIs: it is not Neon sign-in acceptance.
Screenshots and result JSON are retained as CI artifacts. Local Chromium navigation was blocked by
the execution environment's policy; no local visual acceptance is claimed.

Not established by this implementation: live upstream-change detection, production PostgreSQL
migration acceptance, an enabled real Grok workflow, a deployed/model-driven Eve run, new provider
adapters, semantic/visual ranking, private/team projects, large-scale load acceptance or thousands
of newly reviewed assets. A source pin or declared dependency is not a security certification.
