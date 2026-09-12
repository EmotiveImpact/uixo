import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RegistryError, identifier, integer, record, text } from './domain.ts';
import type { Registry } from './service.ts';
import { principal, type Principal } from './auth.ts';
import { checkCompatibility, resolveAsset } from './policy.ts';
import { enqueue, jobs, runJob } from './jobs.ts';

export type RequestLike = IncomingMessage & { body?: unknown };
export function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  res.end(JSON.stringify(value));
}
export async function readJson(req: RequestLike, limit = 200_000): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new RegistryError('CONTENT_TYPE', 'Use application/json.', 415);
  if (Number(req.headers['content-length'] ?? 0) > limit) throw new RegistryError('BODY_TOO_LARGE', 'Request body is too large.', 413);
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > limit) throw new RegistryError('BODY_TOO_LARGE', 'Request body is too large.', 413);
    try { return JSON.parse(raw); } catch { throw new RegistryError('INVALID_JSON', 'Request body must be valid JSON.'); }
  }
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of req) { const buffer = Buffer.from(chunk); bytes += buffer.length; if (bytes > limit) throw new RegistryError('BODY_TOO_LARGE', 'Request body is too large.', 413); chunks.push(buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RegistryError('INVALID_JSON', 'Request body must be valid JSON.'); }
}
export function checkOrigin(req: IncomingMessage, expectedOrigin: string) {
  const origin = req.headers.origin;
  if (origin && origin !== expectedOrigin) throw new RegistryError('ORIGIN_BLOCKED', 'Cross-origin requests are not allowed.', 403);
}
export async function rateLimit(registry: Registry, key: string, maximum = 180) {
  const minute = Math.floor(Date.now() / 60000);
  const bucket = createHash('sha256').update(`${process.env.UIXO_RATE_SALT ?? 'uixo'}:${key}:${minute}`).digest('hex');
  const expiry = new Date((minute + 2) * 60000).toISOString();
  const rows = await registry.db.query('INSERT INTO uixo_v2_rate_limits(bucket,count,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET count=uixo_v2_rate_limits.count+1 RETURNING count', [bucket, expiry]);
  if (Number(rows[0].count) > maximum) throw new RegistryError('RATE_LIMITED', 'Too many requests. Try again shortly.', 429);
  if (Math.random() < 0.02) await registry.db.query('DELETE FROM uixo_v2_rate_limits WHERE expires_at<$1', [new Date().toISOString()]);
}
export function createRegistryHandler(registry: Registry, options: { origin: string; authenticate?: (req: RequestLike) => Promise<Principal> } ) {
  const authenticate = options.authenticate ?? principal;
  return async (req: RequestLike, res: ServerResponse) => {
    const requestId = randomUUID();
    try {
      checkOrigin(req, options.origin);
      const url = new URL(req.url ?? '/', options.origin), action = url.searchParams.get('action') ?? 'search';
      const method = req.method ?? 'GET';
      const routes: Record<string, string[]> = { search: ['GET'], asset: ['GET'], providers: ['GET'], status: ['GET'], compatibility: ['POST'], resolve: ['POST'], queue: ['GET'], review: ['POST'], scout: ['POST', 'GET'], jobs: ['GET'], enqueue: ['POST'], run: ['POST'] };
      if (!routes[action]) throw new RegistryError('NOT_FOUND', 'Unknown registry operation.', 404);
      if (!routes[action].includes(method)) { res.setHeader('allow', routes[action].join(', ')); throw new RegistryError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405); }
      const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] ?? req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim() : req.socket.remoteAddress ?? 'local';
      await rateLimit(registry, `request:${ip}`, 180);
      const who = await authenticate(req);
      const operatorAction = ['queue', 'review', 'scout', 'jobs', 'enqueue', 'run'].includes(action);
      if (operatorAction && (!who || (who.role !== 'curator' && !(who.role === 'scout' && action === 'scout' && method === 'POST') && !(who.role === 'worker' && ['queue', 'jobs', 'enqueue', 'run'].includes(action)) && !(who.role === 'worker' && action === 'scout' && method === 'GET')))) throw new RegistryError('UNAUTHORISED', 'A curator account or an appropriately scoped service credential is required.', 401);
      if (operatorAction && method === 'POST' && registry.db.mode === 'snapshot') throw new RegistryError('READ_ONLY_SNAPSHOT', 'This deployment is a read-only source snapshot. Configure a persistent registry database to enable writes.', 503);
      if (operatorAction) await rateLimit(registry, `operator:${who!.id}`, 60);
      const body = method === 'POST' ? record(await readJson(req)) : {};
      let result: unknown;
      if (action === 'search') { const input: Record<string, unknown> = Object.fromEntries(url.searchParams); if (input.saved) input.saved = String(input.saved).split(','); result = await registry.search(input); }
      else if (action === 'asset') result = await registry.inspect(identifier(url.searchParams.get('id')));
      else if (action === 'providers') result = { items: await registry.providers() };
      else if (action === 'status') {
        const stats = await registry.stats();
        const { pending, discoveries, ...publicStats } = stats;
        void pending; void discoveries;
        result = { version: '0.2.0', storage: registry.db.mode, readOnly: registry.db.mode === 'snapshot', stats: who?.role === 'curator' ? stats : publicStats, role: who?.role ?? 'visitor', eveConfigured: Boolean(process.env.UIXO_EVE_URL && process.env.UIXO_EVE_TOKEN), searchMode: 'weighted-keyword', mcpPath: '/api/mcp' };
      }
      else if (action === 'queue') result = await registry.queue(integer(url.searchParams.get('limit') ?? undefined, 48, 1, 48), integer(url.searchParams.get('offset') ?? undefined, 0, 0, 100000));
      else if (action === 'review') { const decision = text(body.decision, 20); if (!['approve', 'reject'].includes(decision)) throw new RegistryError('INVALID_INPUT', 'Decision must be approve or reject.'); const reason = text(body.reason, 2000); if (reason.length < 10) throw new RegistryError('INVALID_INPUT', 'Give a review reason of at least 10 characters.'); result = await registry.review(identifier(body.id), decision as 'approve' | 'reject', who!.id, reason); }
      else if (action === 'scout') result = method === 'POST' ? await registry.scout(body) : { items: await registry.scoutQueue() };
      else if (action === 'jobs') result = { items: await jobs(registry) };
      else if (action === 'enqueue') result = await enqueue(registry, identifier(body.providerId), body.afterJobId ? identifier(body.afterJobId) : undefined);
      else if (action === 'run') result = await runJob(registry, identifier(body.id));
      else { const asset = await registry.inspect(identifier(body.id)); const variant = body.variantId ? identifier(body.variantId) : undefined; result = action === 'resolve' ? resolveAsset(asset, variant) : checkCompatibility(asset, body.project ?? {}, variant); }
      json(res, 200, result);
    } catch (error) {
      const known = error instanceof RegistryError;
      if (!known) console.error(JSON.stringify({ event: 'registry_request_failed', requestId, error: 'INTERNAL_ERROR' }));
      if (!res.headersSent) json(res, known ? error.status : 503, { error: { code: known ? error.code : 'REGISTRY_UNAVAILABLE', message: known ? error.message : 'The registry is unavailable. Check its database configuration and migration status.', requestId } });
      else res.end();
    }
  };
}
