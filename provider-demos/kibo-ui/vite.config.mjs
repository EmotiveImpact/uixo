import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { dependencyNotices } from './notices.mjs';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  base: './',
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      return hostType === 'html' ? `/provider-demos/kibo-ui/${filename}` : { relative: true };
    },
  },
  publicDir: false,
  plugins: [
    {
      name: 'reviewed-kibo-workspace-aliases',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer?.startsWith(path.join(root, 'vendor'))) return;
        if (source.startsWith('@repo/')) {
          const [name, ...parts] = source.slice(6).split('/');
          return this.resolve(
            path.join(root, 'vendor/packages', name, parts.length ? parts.join('/') : 'index.tsx'),
            importer,
            { skipSelf: true },
          );
        }
        if (source.startsWith('@/'))
          return this.resolve(
            path.join(root, 'vendor/packages/shadcn-ui', source.slice(2)),
            importer,
            { skipSelf: true },
          );
      },
    },
    {
      name: 'retained-upstream-notices',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'LICENSE.kibo-ui.txt',
          source: readFileSync(path.join(root, 'LICENSE.upstream.txt'), 'utf8'),
        });
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD-PARTY-NOTICES.txt',
          source: dependencyNotices(root),
        });
      },
    },
    react(),
    tailwind(),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    outDir: path.join(root, '../../public/provider-demos/kibo-ui'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
  },
});
