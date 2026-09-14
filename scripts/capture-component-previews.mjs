/**
 * Capture the real, rendered demo shown on each provider's official documentation page.
 *
 * This intentionally captures the provider's demo canvas rather than rebuilding or
 * approximating components inside UIXO. The resulting WebP files are committed so the
 * catalogue stays fast and does not depend on third-party pages at runtime.
 *
 * Usage:
 *   node scripts/capture-component-previews.mjs
 *   node scripts/capture-component-previews.mjs magic-ui/android motion-primitives/accordion
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_ROOT = join(ROOT, 'public/assets/component-previews');
const CAPTURED_AT = new Date().toISOString();
const ARGUMENTS = process.argv.slice(2);
const REQUESTED = new Set(ARGUMENTS.filter((argument) => !argument.startsWith('--provider=')));
const PROVIDER_FILTER = ARGUMENTS.find((argument) => argument.startsWith('--provider='))?.slice(11);
const EXCLUDED_COMPONENTS = new Set([
  // These entries exist in Magic UI's generated registry manifest, but their declared
  // source files do not exist at the same pinned commit. They must not enter UIXO as
  // source-backed assets until the provider publishes matching source again.
  'magic-ui/script-copy-btn',
  'magic-ui/flip-text',
  'magic-ui/scratch-to-reveal',
  'magic-ui/box-reveal',
  'magic-ui/iphone-15-pro',
  'magic-ui/arc-timeline',
  'magic-ui/grid-beams',
]);

const PROVIDERS = {
  shadcn: {
    snapshot: join(ROOT, 'data/registry/captured.json'),
    items(registry) {
      return registry.components.map(([name]) => ({ name, type: 'registry:ui' }));
    },
    page(slug) {
      if (slug === 'form') return 'https://ui.shadcn.com/docs/forms/react-hook-form';
      if (slug === 'sidebar') return 'https://ui.shadcn.com/docs/components/radix/sidebar';
      return `https://ui.shadcn.com/docs/components/${slug}`;
    },
    selector(slug) {
      return slug === 'sidebar' ? 'main iframe[src*="sidebar-demo"]' : '[data-slot="preview"]';
    },
  },
  'magic-ui': {
    snapshot: join(ROOT, 'data/registry/snapshots/magic-ui.json'),
    page(slug) {
      const routes = { 'client-tweet-card': 'tweet-card' };
      return `https://magicui.design/docs/components/${routes[slug] ?? slug}`;
    },
    selector: '[data-slot="preview"][data-active="true"] > .preview',
  },
  'motion-primitives': {
    snapshot: join(ROOT, 'data/registry/snapshots/motion-primitives.json'),
    page(slug) {
      return `https://motion-primitives.com/docs/${slug}`;
    },
    selector: 'main [role="tabpanel"][data-state="active"]',
  },
};

function findChrome() {
  const candidates = [
    process.env.UIXO_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) throw new Error('Chrome was not found. Set UIXO_CHROME_PATH.');
  return chrome;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpClient {
  #id = 0;
  #pending = new Map();
  #socket;

  constructor(url) {
    this.#socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.#socket.addEventListener('open', resolve, { once: true });
      this.#socket.addEventListener('error', reject, { once: true });
    });
    this.#socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.#socket.close();
  }
}

async function retry(action, label, attempts = 80, delay = 125) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await action();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(delay);
  }
  throw lastError ?? new Error(`Timed out waiting for ${label}.`);
}

async function launchBrowser() {
  const profile = await mkdtemp(join(tmpdir(), 'uixo-component-capture-'));
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-features=Translate,OptimizationHints,MediaRouter',
      '--disable-sync',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--window-size=1280,960',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  chrome.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const activePort = join(profile, 'DevToolsActivePort');
  const [port] = await retry(async () => {
    try {
      return (await readFile(activePort, 'utf8')).trim().split('\n');
    } catch {
      if (chrome.exitCode !== null) throw new Error(stderr || `Chrome exited ${chrome.exitCode}.`);
      return null;
    }
  }, 'Chrome DevTools');
  const page = await retry(async () => {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
      response.json(),
    );
    return pages.find((entry) => entry.type === 'page');
  }, 'Chrome page');
  const cdp = new CdpClient(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });
  return {
    cdp,
    async close() {
      cdp.close();
      if (chrome.exitCode === null) {
        const exited = once(chrome, 'exit');
        chrome.kill('SIGTERM');
        await Promise.race([exited, wait(3000)]);
      }
      if (chrome.exitCode === null) chrome.kill('SIGKILL');
      await rm(profile, { recursive: true, force: true });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.text || 'Evaluation failed.');
  return result.result.value;
}

async function capture(cdp, target) {
  await cdp.send('Page.navigate', { url: target.url });
  await retry(
    async () => evaluate(cdp, `document.readyState === 'complete'`),
    `${target.id} page load`,
    160,
    125,
  );

  const selector = JSON.stringify(target.selector);
  const rect = await retry(
    async () =>
      evaluate(
        cdp,
        `(() => {
          const element = document.querySelector(${selector});
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          if (rect.width < 100 || rect.height < 80) return null;
          element.scrollIntoView({ block: 'center', inline: 'center' });
          return { title: document.title, width: rect.width, height: rect.height };
        })()`,
      ),
    `${target.id} demo canvas`,
    160,
    125,
  );

  // Let fonts, images and an initial animation frame paint after scrolling the demo onscreen.
  await wait(900);
  const settled = await evaluate(
    cdp,
    `(() => {
      const element = document.querySelector(${selector});
      if (!element) return null;
      // Fixed and sticky documentation chrome is painted into CDP clips even when the
      // clip points further down the document. Hide only chrome outside the demo canvas.
      for (const node of document.body.querySelectorAll('*')) {
        if (element.contains(node)) continue;
        const position = getComputedStyle(node).position;
        if (position === 'fixed' || position === 'sticky') node.style.visibility = 'hidden';
      }
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
        title: document.title,
      };
    })()`,
  );
  if (!settled) throw new Error(`${target.id} demo disappeared before capture.`);

  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 82,
    fromSurface: true,
    captureBeyondViewport: true,
    clip: {
      x: settled.x,
      y: settled.y,
      width: settled.width,
      height: settled.height,
      scale: 1,
    },
  });
  const bytes = Buffer.from(screenshot.data, 'base64');
  if (bytes.length < 400) throw new Error(`${target.id} capture is unexpectedly small.`);
  await mkdir(dirname(target.output), { recursive: true });
  await writeFile(target.output, bytes);
  const info = await stat(target.output);
  console.log(
    `${target.id}: ${Math.round(settled.width)}x${Math.round(settled.height)}, ${Math.round(
      info.size / 1024,
    )} KB`,
  );
  return {
    path: `/assets/component-previews/${target.id}.webp`,
    sourceUrl: target.url,
    title: rect.title || settled.title,
    capturedAt: CAPTURED_AT,
    width: Math.round(settled.width),
    height: Math.round(settled.height),
    bytes: info.size,
  };
}

async function targets() {
  const result = [];
  for (const [providerId, config] of Object.entries(PROVIDERS)) {
    if (PROVIDER_FILTER && providerId !== PROVIDER_FILTER) continue;
    const registry = JSON.parse(await readFile(config.snapshot, 'utf8'));
    for (const item of config.items ? config.items(registry) : registry.items) {
      if (!['registry:ui', 'registry:component'].includes(item.type)) continue;
      const id = `${providerId}/${item.name}`;
      if (EXCLUDED_COMPONENTS.has(id)) continue;
      if (REQUESTED.size && !REQUESTED.has(id)) continue;
      const legacyMagicDemo = id === 'magic-ui/animated-subscribe-button';
      result.push({
        id,
        output: join(OUTPUT_ROOT, `${id}.webp`),
        selector: legacyMagicDemo
          ? 'main [role="tabpanel"][data-state="active"] > div > div:last-child'
          : typeof config.selector === 'function'
            ? config.selector(item.name)
            : config.selector,
        url: legacyMagicDemo
          ? `https://v3.magicui.design/docs/components/${item.name}`
          : config.page(item.name),
      });
    }
  }
  if (PROVIDER_FILTER && !PROVIDERS[PROVIDER_FILTER]) {
    throw new Error(`Unknown provider: ${PROVIDER_FILTER}`);
  }
  if (REQUESTED.size && result.length !== REQUESTED.size) {
    const found = new Set(result.map((target) => target.id));
    throw new Error(
      `Unknown component ids: ${[...REQUESTED].filter((id) => !found.has(id)).join(', ')}`,
    );
  }
  return result;
}

const browser = await launchBrowser();
const manifestPath = join(OUTPUT_ROOT, 'manifest.json');
let manifest = { capturedAt: CAPTURED_AT, captures: {} };
const failures = [];
try {
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    // A first capture has no manifest yet.
  }
  manifest.capturedAt = CAPTURED_AT;
  const captureTargets = await targets();
  if (!REQUESTED.size && !PROVIDER_FILTER) {
    const expected = new Set(captureTargets.map((target) => target.id));
    manifest.captures = Object.fromEntries(
      Object.entries(manifest.captures).filter(([id]) => expected.has(id)),
    );
  }
  for (const target of captureTargets) {
    try {
      manifest.captures[target.id] = await capture(browser.cdp, target);
    } catch (error) {
      failures.push({
        id: target.id,
        message: error instanceof Error ? error.message : String(error),
      });
      console.error(`${target.id}: FAILED — ${failures.at(-1).message}`);
    }
    await mkdir(OUTPUT_ROOT, { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
} finally {
  await browser.close();
}

console.log(`Captured ${Object.keys(manifest.captures).length} official component demos.`);
if (failures.length) {
  throw new Error(
    `${failures.length} captures failed:\n${failures.map((failure) => `- ${failure.id}: ${failure.message}`).join('\n')}`,
  );
}
