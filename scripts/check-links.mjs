/**
 * Re-requests every listing's URL and reports what needs attention: dead links,
 * redirects that have become permanent, and entries whose `lastChecked` has gone stale.
 *
 * Exits non-zero when something is broken, so it can run on a schedule in CI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = JSON.parse(readFileSync(join(root, 'src/content/resources.json'), 'utf8'));
const STALE_DAYS = Number(process.env.STALE_DAYS ?? 90);
const TIMEOUT_MS = 15000;

// Plenty of hosts reject requests with no User-Agent outright.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (compatible; UIXO-linkcheck/1.0; +https://uixo.dev) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
};

/**
 * Bot protection answers a machine differently from a person, so these cannot be called
 * dead — only unverified. Reporting them as broken would train everyone to ignore the run.
 */
const BOT_WALL = new Set([401, 403, 405, 406, 429, 503]);

async function check(resource) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Some hosts reject HEAD; fall back to a ranged GET rather than reporting a false dead link.
    let response = await fetch(resource.url, {
      method: 'HEAD',
      headers: HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    });

    // Some hosts reject HEAD but answer GET; try once before judging.
    if (!response.ok) {
      response = await fetch(resource.url, {
        headers: { ...HEADERS, range: 'bytes=0-2048' },
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    return {
      resource,
      status: response.status,
      finalUrl: response.url,
      ok: response.ok,
      unverified: !response.ok && BOT_WALL.has(response.status),
    };
  } catch (error) {
    return {
      resource,
      status: 0,
      finalUrl: null,
      ok: false,
      unverified: false,
      error: String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = await Promise.all(resources.map(check));

const broken = results.filter((result) => !result.ok && !result.unverified);
const unverified = results.filter((result) => result.unverified);
const redirected = results.filter(
  (result) =>
    result.ok &&
    result.finalUrl &&
    result.finalUrl.replace(/\/$/, '') !== result.resource.url.replace(/\/$/, ''),
);

const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
const stale = resources.filter((resource) => {
  const checked = new Date(`${resource.lastChecked}T00:00:00Z`).getTime();
  return Number.isNaN(checked) || checked < cutoff;
});

for (const { resource, status, error } of broken) {
  console.error(`BROKEN  ${resource.id.padEnd(12)} ${status || error} ${resource.url}`);
}
for (const { resource, status } of unverified) {
  console.warn(`BLOCKED ${resource.id.padEnd(12)} ${status} — bot protection, check by hand`);
}
for (const { resource, finalUrl } of redirected) {
  console.warn(`MOVED   ${resource.id.padEnd(12)} -> ${finalUrl}`);
}
for (const resource of stale) {
  console.warn(`STALE   ${resource.id.padEnd(12)} last checked ${resource.lastChecked}`);
}

console.log(
  `\n${results.length} checked · ${broken.length} broken · ${unverified.length} blocked · ` +
    `${redirected.length} redirected · ${stale.length} stale`,
);

if (broken.length) process.exit(1);
