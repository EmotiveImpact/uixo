# UIXO v2 setup and verification

## Local browser plus API

Use the working branch `codex/integrate-pr-20`. It integrates the v2 work with the latest `main` but is not merged into `main` yet.

Install the repository's locked dependencies using the Node 22 runtime specified in `package.json`:

```sh
npm ci
npm run registry:deps
```

Start the local registry API in one terminal:

```sh
npm run registry:dev -- --memory
```

Start the existing Vite application in another:

```sh
npm run dev
```

Open `http://127.0.0.1:3000/browse/assets`. The original directory is at `http://127.0.0.1:3000/browse`.

Vite proxies `/api/registry` and `/api/mcp` to `http://127.0.0.1:4175`. It uses a fixed port and `strictPort` so the explicit local-origin allowlist cannot silently become incorrect. The registry development server accepts that exact browser origin in addition to its own origin; production origin validation is unchanged. Use `127.0.0.1`, not `localhost`, for this configuration.

`--memory` uses a disposable local database and seeds the captured catalogue. Omit it to use `.uixo/registry.sqlite`. The development server does not use `UIXO_DATABASE_URL`.

For isolated local curator testing:

```sh
npm run registry:dev -- --memory --dev-curator
```

Open `http://127.0.0.1:4175/registry/?view=review` to establish the local-only HTTP-only curator cookie. This is not a production sign-in mechanism. Normal account sign-in still requires the existing auth service; the local registry server does not replace that service.

## Persistent registry

Provision/select an isolated preview or development Postgres database first. Configure `UIXO_DATABASE_URL` securely in the execution/deployment environment. It is separate from the existing editorial/auth `DATABASE_URL`.

Inspect `db/migrations/002-registry.sql` and take the appropriate backup before applying it to another database. The integration previews use the additive `uixo_v2_*` tables in the permanent Neon branch `uixo-preview`; production remains on Neon's main branch. Do not point a preview deployment back at the production connection string.

```sh
npm run registry:db -- migrate --allow-remote
npm run registry:db -- seed --allow-remote
```

Those commands require `UIXO_DATABASE_URL` to already be set; otherwise the CLI uses local SQLite. The hosted runtime does not migrate or seed a configured remote database on a public request.

The local CLI can start one bounded provider-indexing run:

```sh
npm run registry:db -- index lucide
```

Use the appropriate database configuration deliberately. A bounded run is not proof that a whole provider was indexed. Review job results, continuation state and staged revisions. Do not automatically publish unknown or changed licence permissions.

## Configuration inventory

Keep values server-side and out of Git, browser storage, public documentation and prompts.

| Variable                                 | Purpose                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `UIXO_DATABASE_URL`                      | Dedicated persistent registry database. Absent means hosted read-only snapshot mode.             |
| `DATABASE_URL`                           | Existing editorial/auth database, also used for curator-role lookup.                             |
| `NEON_AUTH_BASE_URL`                     | Existing authentication service.                                                                 |
| `UIXO_AUTH_ISSUER`, `UIXO_AUTH_AUDIENCE` | Exact expected claims for registry curator JWT verification.                                     |
| `UIXO_CURATOR_TOKEN`                     | Scoped service credential with curator privileges.                                               |
| `UIXO_SCOUT_TOKEN`                       | Grok intake-only service credential.                                                             |
| `UIXO_WORKER_TOKEN`                      | Indexing worker credential; not publication authority.                                           |
| `UIXO_ORIGIN`                            | Exact application origin used by hosted API origin checks. Configure per deployment environment. |
| `UIXO_RATE_SALT`                         | Salt for registry rate-limit bucket identifiers.                                                 |
| `UIXO_EVE_URL`, `UIXO_EVE_TOKEN`         | Eve integration configuration; presence is not a successful live-session test.                   |

Service tokens must meet the backend's minimum length requirement (24 characters), be independently generated, and have different values for different roles. Store them using the deployment platform's secret configuration, not in this file.

The original site's `CURATOR_TOKEN` is not the same variable as `UIXO_CURATOR_TOKEN`.

## Environment boundaries

Use separate Neon branches for preview and production. The stable Astra and Codex integration previews must all override these variables with the preview branch's values:

- `UIXO_DATABASE_URL`
- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `VITE_NEON_AUTH_URL`

`UIXO_DATABASE_URL` stores registry records. `DATABASE_URL` stores account lists, asset favourites and the `neon_auth` user/role record used by curator JWT verification. Pointing only one of them at preview does not isolate the user journey.

Configure preview Auth on the preview branch and allow only the stable preview aliases plus the deliberate localhost origin. Provider callback URLs must be the callback Neon shows for that branch. Keep production Auth domains and credentials out of preview.

Do not guess `UIXO_AUTH_ISSUER` or `UIXO_AUTH_AUDIENCE`. Read the exact claims from the configured Neon Auth issuer or a deliberately created preview session and store those exact values as branch-scoped secrets. Until both exist, human curator JWTs fail closed; independent `UIXO_CURATOR_TOKEN`, `UIXO_SCOUT_TOKEN` and `UIXO_WORKER_TOKEN` service checks still work.

The local `.uixo/` SQLite directory is ignored. It is disposable development state, never a deployment asset or source-controlled backup.

## Pull-request CI

`.github/workflows/ci.yml` runs for every pull request and for pushes to `main`, `astra/**` and `codex/**`. It installs the root and registry dependencies from lockfiles, checks formatting and lint, runs the application suite, then runs the complete build. The build includes registry HTTP/domain tests, the real MCP client contract, source-pinned preview integrity, TypeScript, the Vite bundle and prerendering.

The separate registry bootstrap workflow remains manually dispatchable for its fixture generation task. It is not the ordinary merge gate.

## Release runbook

1. Keep the pull request in draft while a required gate is missing. Confirm the branch is current with `main` and inspect the final diff.
2. Confirm the target Vercel environment points at the intended Neon branch. Never infer this from the variable name alone; query `/api/registry?action=status` and confirm persistent Postgres, writes enabled, the expected asset/provider counts and the expected deployment URL.
3. Apply additive migrations to the intended branch, inspect the resulting schema and seed only reviewed source snapshots. Record the migration and seed result.
4. Verify authentication on the same deployment: signed-out reads, Google/provider callback, a normal signed-in account, an allowed curator, and denied normal/scout/worker mutation attempts. Do not reuse production identities or service credentials in preview.
5. Verify `/browse`, `/browse/assets`, collections and both saved-item destinations at desktop and narrow widths. Exercise search, filters, back/forward, detail, acquisition, save/reload, empty/error states and sidebar collapse.
6. Run one real MCP client through tool listing, search, inspect, preview and acquisition guidance. Retain provenance and licence notices in the result.
7. Require GitHub CI and Vercel deployment checks to pass. A green deployment alone is not release acceptance.
8. Back up production, apply its migrations deliberately, promote the exact accepted commit and repeat the hosted smoke checks before closing the release task.
9. If any runtime check fails, stop promotion, preserve the current production deployment and record the failing URL, response, logs and rollback decision.

## Verification commands

```sh
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
npm run registry:test
npm run registry:test:mcp
node --experimental-strip-types --test tests/registry/library-client.node.ts
```

The last command tests the integrated client's contracts without React or a network. It does not replace a full application build or browser end-to-end test.

## Hosted acceptance gates

Check the actual preview for this branch, not the production site on `main`.

Verify `/browse`, `/browse/assets`, `/api/registry?action=status`, a paginated search, asset detail, acquisition POST, saved-view reload, sidebar collapse, mobile navigation and a real MCP client's tool listing and call.

A successful Vercel GitHub status is build/deployment metadata, not evidence that the registry initialised or that the client can retrieve an asset. Verify runtime logs and data-file tracing when a function returns 503.

For Eve, verify the separately deployed service, its route authentication and a bounded real indexing job. For Grok, send an authorised test payload through its actual intake path, inspect staged evidence and prove curator review before publication.

Never enable unbounded paid model jobs or scheduled provider crawling merely to make a status indicator green.
