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

Inspect `db/migrations/002-registry.sql` and take the appropriate backup before applying it to another database. The current Vercel preview uses the additive `uixo_v2_*` tables in the connected Neon database.

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
