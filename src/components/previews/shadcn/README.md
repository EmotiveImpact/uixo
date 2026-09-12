# Pinned shadcn preview primitives

These five primitives were copied from shadcn/ui commit
`2b3e6d4f8d9161fe5c19340dc383aade392012dd` on 12 September 2026. UIXO uses
them only to render reviewed catalogue previews. The sole source change is the
`cn` import path, which points at UIXO's equivalent local helper.

Upstream source:
`https://github.com/shadcn-ui/ui/tree/2b3e6d4f8d9161fe5c19340dc383aade392012dd/apps/v4/registry/new-york-v4/ui`

The upstream MIT licence is retained in `LICENSE.md`. Add a component to the
preview map only after copying it from an immutable source reference, reviewing
its dependencies, and testing its desktop and mobile render.
