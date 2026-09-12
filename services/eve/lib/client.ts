export type Action = 'scout' | 'queue' | 'jobs' | 'enqueue' | 'run';
/** Fixed-origin, scoped client. No arbitrary URL, SQL, publication or shell tool. */
export async function registryCall(action: Action, body?: Record<string, unknown>, options: { fetchImpl?: typeof fetch; origin?: string; token?: string } = {}): Promise<Record<string, unknown>> {
  if (!['scout', 'queue', 'jobs', 'enqueue', 'run'].includes(action)) throw new Error('Unsupported operator action.');
  if ((body !== undefined) !== ['enqueue', 'run'].includes(action)) throw new Error('Method is not permitted for this operator action.');
  const origin = options.origin ?? process.env.UIXO_API_ORIGIN;
  const token = options.token ?? process.env.UIXO_WORKER_TOKEN;
  if (!origin || !token || token.length < 32) throw new Error('UIXO worker connection is not configured.');
  const target = new URL(origin);
  if (target.protocol !== 'https:' || target.username || target.password || target.port || target.pathname !== '/' || target.search || target.hash) throw new Error('Use a fixed HTTPS origin without credentials, query or path.');
  const url = new URL('/api/registry', target); url.searchParams.set('action', action);
  if (action === 'queue') url.searchParams.set('limit', '12');
  const response = await (options.fetchImpl ?? fetch)(url, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(action === 'run' ? 300_000 : 20_000) });
  if (!response.ok || !response.body) throw new Error(`UIXO operator request failed (${response.status}). Inspect the registry job log; credentials and upstream responses are not echoed.`);
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 300_000) throw new Error('UIXO response exceeded its byte budget.'); parts.push(next.value); } } finally { await reader.cancel().catch(() => {}); }
  const data = JSON.parse(Buffer.concat(parts).toString('utf8')) as Record<string, unknown>;
  if (Array.isArray(data.items)) data.items = data.items.slice(0, 12).map((item: Record<string, unknown>) => {
    if (item.asset && typeof item.asset === 'object') { const asset = item.asset as Record<string, unknown>; const licence = asset.licence as Record<string, unknown>; return { ...item, asset: { ...asset, licence: { ...licence, text: undefined } } }; }
    return item;
  });
  return data;
}
