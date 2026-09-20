import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
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
        const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
        const notices = [];
        for (const entry of Object.keys(lock.packages)
          .filter((entry) => entry.startsWith('node_modules/'))
          .sort()) {
          const directory = path.join(root, entry);
          const metadata = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
          const files = readdirSync(directory).filter((name) =>
            /^(licen[cs]e|copying|notice)([.-].*)?$/i.test(name),
          );
          if (!files.length) throw new Error(`Dependency licence notice missing: ${metadata.name}`);
          notices.push(
            `${metadata.name}@${metadata.version} (${metadata.license ?? 'See retained notice'})`,
          );
          for (const name of files) notices.push(readFileSync(path.join(directory, name), 'utf8'));
        }
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD-PARTY-NOTICES.txt',
          source: notices.join('\n\n'),
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
