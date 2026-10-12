import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  // Vite uses import.meta.url for lazy preloads with a relative base. A provider
  // <base> used by original demo media must never redirect UIXO's JS/CSS chunks.
  base: './',
  experimental: {
    // Vercel cleanUrls serves index.html at /live-demos (without a slash).
    // HTML entry URLs must survive that redirect. Lazy JS/CSS URLs must remain
    // relative to import.meta.url so provider <base> tags cannot redirect them.
    renderBuiltUrl(filename, { hostType }) {
      return hostType === 'html' ? `/live-demos/${filename}` : { relative: true };
    },
  },
  publicDir: false,
  plugins: [
    {
      name: 'original-provider-aliases',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.startsWith('@/') && importer) {
          const provider = importer.match(/vendor\/([^/]+)\//)?.[1];
          if (provider)
            return this.resolve(
              path.join(
                root,
                'vendor',
                provider,
                provider === 'simply-buttons' ? 'src' : '',
                source.slice(2),
              ),
              importer,
              {
                skipSelf: true,
              },
            );
        }
      },
    },
    {
      // The detail page's Code tab shows each demo's pinned source as plain text, served
      // from UIXO's origin next to the demos. Never evaluated, only displayed.
      name: 'demo-sources',
      generateBundle() {
        const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
        for (const [id, entry] of Object.entries(manifest)) {
          if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) continue;
          this.emitFile({
            type: 'asset',
            fileName: `sources/${id}.txt`,
            source: fs.readFileSync(path.join(root, entry.file), 'utf8'),
          });
        }
      },
    },
    react(),
    tailwind(),
  ],
  resolve: {
    alias: {
      'next/link': path.join(root, 'adapters/link.tsx'),
      'next/image': path.join(root, 'adapters/image.tsx'),
      'next-themes': path.join(root, 'adapters/theme.tsx'),
    },
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: path.join(root, '../public/live-demos'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  server: { host: '127.0.0.1', port: 4176, strictPort: true, cors: true },
});
