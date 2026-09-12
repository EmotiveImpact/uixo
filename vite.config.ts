import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  authPathFromUrl,
  incomingToRequest,
  proxyNeonAuth,
  sendAuthResponse,
} from './api/_lib/auth-proxy';
import { runVercelHandler } from './api/_lib/dev-api';

const publicRoot = fileURLToPath(new URL('./public', import.meta.url));

function previewType(file: string) {
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

function previewFile(urlPath: string) {
  const relative = urlPath.slice(1);
  const guesses = [relative];
  if (!path.extname(urlPath)) {
    const trimmed = relative.replace(/\/$/, '');
    guesses.push(`${trimmed}.html`);
    if (urlPath.endsWith('/')) guesses.push(`${relative}index.html`);
  }
  for (const guess of guesses) {
    const file = path.normalize(path.join(publicRoot, guess));
    if (
      file.startsWith(publicRoot + path.sep) &&
      fs.existsSync(file) &&
      fs.statSync(file).isFile()
    ) {
      return file;
    }
  }
  return null;
}

function sendPreview(res: import('http').ServerResponse, file: string) {
  res.setHeader('Content-Type', previewType(file));
  res.setHeader('Cache-Control', 'no-store');
  res.end(fs.readFileSync(file));
}

function localPreviews(): Plugin {
  return {
    name: 'uilist-previews',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
        if (!urlPath.startsWith('/previews/')) return next();
        const file = previewFile(urlPath);
        if (file) {
          sendPreview(res, file);
          return;
        }
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Preview not found');
      });
    },
  };
}

function localAuth(): Plugin {
  return {
    name: 'uilist-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (path !== '/api/auth' && !path.startsWith('/api/auth/')) return next();
        void incomingToRequest(req)
          .then((request) => proxyNeonAuth(request, authPathFromUrl(path), false))
          .then((response) => sendAuthResponse(res, response))
          .catch(next);
      });
    },
  };
}

function localApi(): Plugin {
  return {
    name: 'uilist-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        const load =
          path === '/api/lists'
            ? () => import('./api/lists')
            : path === '/api/submissions'
              ? () => import('./api/submissions')
              : path === '/api/reports'
                ? () => import('./api/reports')
                : null;
        if (!load) return next();
        void load()
          .then((mod) => runVercelHandler(req, res, mod.default))
          .catch(next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, {
    NEON_AUTH_BASE_URL: env.NEON_AUTH_BASE_URL,
    DATABASE_URL: env.DATABASE_URL,
    NEON_AUTH_COOKIE_SECRET: env.NEON_AUTH_COOKIE_SECRET,
  });

  return {
    plugins: [localPreviews(), localAuth(), localApi(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
    },
  };
});
