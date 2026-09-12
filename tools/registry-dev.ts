import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteDatabase, migrate } from '../registry/database.ts';
import { Registry } from '../registry/service.ts';
import { seedCaptured } from '../registry/bootstrap.ts';
import { createRegistryHandler, json } from '../registry/http.ts';
import type { RequestLike } from '../registry/http.ts';
import type { Principal } from '../registry/auth.ts';
import { tokenMatches } from '../registry/policy.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT ?? 4175),
  origin = `http://127.0.0.1:${port}`;
const devCurator = process.argv.includes('--dev-curator');
if (process.env.VERCEL) throw new Error('The local development server must not run on Vercel.');
const db = await sqliteDatabase(
  process.argv.includes('--memory') ? ':memory:' : resolve(root, '.uixo/registry.sqlite'),
);
await migrate(db);
const registry = new Registry(db);
await seedCaptured(registry);
const session = randomBytes(32).toString('hex');
const authenticate = async (req: RequestLike): Promise<Principal> =>
  devCurator &&
  tokenMatches(
    req.headers.cookie
      ?.split('; ')
      .find((c) => c.startsWith('uixo_dev='))
      ?.slice(9) ?? '',
    session,
  )
    ? { id: 'local-development-curator', role: 'curator' }
    : null;
const handle = createRegistryHandler(registry, { origin, authenticate });
// Vite proxies the integrated browser's same-origin calls. Only this explicit local
// development origin is added; production origin validation is not relaxed.
const browserOrigin = 'http://127.0.0.1:5173';
const handleFromVite = createRegistryHandler(registry, { origin: browserOrigin, authenticate });
const server = createServer(async (req, res) => {
  if (req.headers.host !== `127.0.0.1:${port}`)
    return json(res, 403, { error: { message: 'Invalid Host header.' } });
  const url = new URL(req.url ?? '/', origin);
  if (url.pathname === '/api/registry')
    return (req.headers.origin === browserOrigin ? handleFromVite : handle)(req, res);
  if (url.pathname === '/api/mcp') {
    try {
      const { handleMcp } = await import('../registry/mcp-http.ts');
      await handleMcp(
        registry,
        req,
        res,
        req.headers.origin === browserOrigin ? browserOrigin : origin,
      );
    } catch {
      json(res, 503, {
        error: {
          message:
            'MCP dependencies are not installed. Run npm run registry:deps in the repository.',
        },
      });
    }
    return;
  }
  if (url.pathname === '/api/auth/token') return json(res, 200, { token: null });
  if (
    url.pathname === '/' ||
    url.pathname === '/registry' ||
    url.pathname.startsWith('/registry/')
  ) {
    const pathname =
      url.pathname === '/' || url.pathname === '/registry' || url.pathname === '/registry/'
        ? 'registry/index.html'
        : url.pathname.slice(1);
    const path = resolve(root, 'public', pathname);
    if (!path.startsWith(resolve(root, 'public/registry') + '/') || pathname.includes('..'))
      return json(res, 404, { error: { message: 'Not found.' } });
    try {
      const content = await readFile(path);
      const types: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      };
      res.setHeader('content-type', `${types[extname(path)] ?? 'text/plain'}; charset=utf-8`);
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader(
        'content-security-policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://raw.githubusercontent.com; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
      if (devCurator && path.endsWith('index.html'))
        res.setHeader('set-cookie', `uixo_dev=${session}; Path=/; HttpOnly; SameSite=Strict`);
      res.end(content);
    } catch {
      json(res, 404, { error: { message: 'Not found.' } });
    }
  } else
    json(res, 404, {
      error: {
        message:
          'The editorial site and integrated asset browser are served by Vite on http://127.0.0.1:5173.',
      },
    });
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `UIXO registry API: ${origin}/api/registry?action=status\nIntegrated UI: http://127.0.0.1:5173/browse/assets (also run npm run dev)\n${devCurator ? `Local curator workspace: ${origin}/registry/?view=review` : 'Visitor session; add --dev-curator for isolated curator testing.'}`,
  ),
);
process.on('SIGTERM', () =>
  server.close(() => {
    void db.close();
  }),
);
