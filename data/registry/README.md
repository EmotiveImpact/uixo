# Registry source snapshots

This directory retains the source evidence used by the read-only UIXO registry and by the
explicit `registry:db seed` operator command. A snapshot is provider-declared metadata, not a
copy of the component code and not proof that a component works in every project.

## Captured providers

| Provider | Records | Source reference | Licence evidence |
| --- | ---: | --- | --- |
| shadcn/ui | 46 | legacy mutable `main` capture | MIT |
| Lucide | 8 | legacy mutable `main` capture | ISC and inherited MIT |
| Heroicons | 13 | legacy mutable `master` capture | MIT |
| Magic UI | 75 | `52bc69354621e5cd7c9bc84a0e42b42f2d0c07b1` | MIT |
| Motion Primitives | 33 | `40f59b61e567712aa8329c7dc8c2ced763054c34` | MIT |

The two JSON files in `snapshots/` are unmodified official registries captured from immutable
GitHub commits. `captured.json` records their source URLs, refs and observation dates. The
normaliser accepts component records only; examples, styles and library helpers stay out of the
public asset catalogue.

## Refreshing a provider

1. Resolve the upstream branch to a full Git commit SHA.
2. Download the registry and licence from that immutable SHA.
3. Update `captured.json` with the source URL, ref and observation date.
4. Run `npm run registry:test` and `npm run registry:verify`.
5. Run `npm run registry:db -- index <provider-id>` against a development registry first. This
   stages records for review and does not publish them.
6. Review source, dependencies, licence and acquisition evidence before approval.

Never add a provider merely because its website says it supports React. An indexable provider
needs an approved source, a deterministic manifest or adapter, retained licence evidence and a
source-controlled acquisition route.
