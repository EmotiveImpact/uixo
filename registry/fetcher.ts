import { RegistryError } from './domain.ts';

const allowedHosts = new Set(['api.github.com', 'raw.githubusercontent.com', 'ui.shadcn.com']);
export class FetchBudget {
  remaining: number; maxBytes: number; fetchImpl: typeof fetch;
  constructor(options: { requests?: number; maxBytes?: number; fetchImpl?: typeof fetch } = {}) { this.remaining = options.requests ?? 12; this.maxBytes = options.maxBytes ?? 8_000_000; this.fetchImpl = options.fetchImpl ?? fetch; }
  async text(urlString: string): Promise<string> {
    const url = new URL(urlString);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHosts.has(url.hostname)) throw new RegistryError('UNTRUSTED_HOST', 'Fetch destination is not approved.', 403);
    if (this.remaining-- <= 0) throw new RegistryError('BUDGET_EXCEEDED', 'Provider request budget exhausted.', 429);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const headers: Record<string, string> = { accept: 'application/json', 'user-agent': 'UIXO-Registry/0.2 (curated asset indexing)' };
      if (url.hostname === 'api.github.com' && process.env.UIXO_GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.UIXO_GITHUB_TOKEN}`;
      const response = await this.fetchImpl(url, { headers, redirect: 'manual', signal: controller.signal });
      if (response.status >= 300 && response.status < 400) throw new RegistryError('REDIRECT_BLOCKED', 'Provider redirects require an adapter review.', 502);
      if (!response.ok) throw new RegistryError('PROVIDER_ERROR', `Provider returned HTTP ${response.status}.`, 502);
      if (Number(response.headers.get('content-length') ?? '0') > this.maxBytes) throw new RegistryError('RESPONSE_TOO_LARGE', 'Provider response exceeds the byte budget.', 502);
      if (!response.body) throw new RegistryError('EMPTY_RESPONSE', 'Provider returned an empty response.', 502);
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > this.maxBytes) throw new RegistryError('RESPONSE_TOO_LARGE', 'Provider response exceeds the byte budget.', 502); chunks.push(item.value); } }
      finally { await reader.cancel().catch(() => {}); }
      return Buffer.concat(chunks).toString('utf8');
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      throw new RegistryError('PROVIDER_UNREACHABLE', 'Provider request failed or timed out. No catalogue changes were published.', 502);
    } finally { clearTimeout(timeout); }
  }
  async json(url: string): Promise<unknown> { const body = await this.text(url); try { return JSON.parse(body); } catch { throw new RegistryError('PROVIDER_FORMAT', 'Provider returned invalid JSON.', 502); } }
}
