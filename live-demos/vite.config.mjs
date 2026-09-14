import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  base: '/live-demos/',
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
