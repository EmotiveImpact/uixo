# UIXO

A minimal directory of UI resources, built with React, TypeScript, Vite, and Tailwind CSS.

## Run locally

```sh
npm ci
npm run dev -- --port 4173
```

## Check and build

```sh
npx tsc --noEmit
npm run build
```

Resource data lives in `src/data.ts`. The site includes category and format filters, Featured/Recent browsing, and favourites saved locally in the browser. Resource submissions are a local-only prototype; no backend is connected.

The animated sidebar uses the original Be UI component. See [COMPONENT-SOURCE.md](COMPONENT-SOURCE.md) for provenance. Resource thumbnails are screenshots of the linked websites; their branding belongs to the respective owners.
