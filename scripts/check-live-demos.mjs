// Opens live demos the way a card does (stage=clear, both themes) and reports whether each
// one starts, what it logs as errors, and how big its content is. Writes report.json and
// contact sheets of every capture, so a person can look at a whole library at once.
//
//   node scripts/check-live-demos.mjs <base> <out-dir> <id or provider/ prefix>...
//
// <base> is the live demo page's folder: http://127.0.0.1:4176 for the live-demos dev
// server, or http://127.0.0.1:3000/live-demos for a built copy served with the site.
// Set PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE when Playwright is installed elsewhere.
/* global window, document */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [base, out, ...wanted] = process.argv.slice(2);
if (!base || !out || !wanted.length)
  throw new Error('Usage: check-live-demos.mjs <base> <out-dir> <id or prefix>...');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const manifest = JSON.parse(await readFile('live-demos/manifest.json', 'utf8'));
const ids = Object.keys(manifest).filter((id) =>
  wanted.some((want) => (want.endsWith('/') ? id.startsWith(want) : id === want)),
);
const VIEW = { width: 480, height: 360 };
const THEMES = ['dark', 'light'];
await mkdir(path.join(out, 'shots'), { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {},
);

async function check(id, theme) {
  const page = await browser.newPage({ viewport: VIEW });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error.message).slice(0, 300)));
  page.on('console', (message) => {
    // A blocked or missing network resource is the network's doing, not the demo's.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
      errors.push(message.text().slice(0, 300));
  });
  await page.addInitScript(() => {
    window.__uixo = { status: '', box: null };
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'uixo-preview-status') window.__uixo.status = event.data.status;
      if (event.data?.type === 'uixo-preview-size') window.__uixo.box = event.data.box;
    });
  });
  const file = `${id.replace('/', '--')}-${theme}.png`;
  let status = 'timeout';
  try {
    await page.goto(`${base}/index.html?id=${encodeURIComponent(id)}&theme=${theme}&stage=clear`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page
      .waitForFunction(() => window.__uixo.status, null, { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(2500);
    status = (await page.evaluate(() => window.__uixo.status)) || 'timeout';
    const box = await page.evaluate(() => window.__uixo.box);
    const text = await page.evaluate(() => document.body.innerText.trim().slice(0, 120));
    await page.screenshot({ path: path.join(out, 'shots', file), omitBackground: true });
    return { id, theme, status, box, text, errors, file };
  } catch (error) {
    errors.push(String(error.message).slice(0, 300));
    return { id, theme, status, box: null, text: '', errors, file: null };
  } finally {
    await page.close();
  }
}

const jobs = ids.flatMap((id) => THEMES.map((theme) => [id, theme]));
const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const [id, theme] = jobs[next++];
      const result = await check(id, theme);
      results.push(result);
      const flag = result.status === 'ready' && !result.errors.length ? 'ok ' : 'BAD';
      console.log(`${flag} ${id} ${theme} ${result.status} ${result.errors[0] ?? ''}`);
    }
  }),
);
results.sort((a, b) => (a.id + a.theme < b.id + b.theme ? -1 : 1));
await writeFile(path.join(out, 'report.json'), `${JSON.stringify(results, null, 2)}\n`);

// Contact sheets: one row per demo, dark then light, 20 demos per sheet.
const PER_SHEET = 20;
for (let sheet = 0; sheet * PER_SHEET < ids.length; sheet++) {
  const rows = await Promise.all(
    ids.slice(sheet * PER_SHEET, (sheet + 1) * PER_SHEET).map(async (id) => {
      const cells = await Promise.all(
        THEMES.map(async (theme) => {
          const result = results.find((r) => r.id === id && r.theme === theme);
          const image = result?.file
            ? (await readFile(path.join(out, 'shots', result.file))).toString('base64')
            : '';
          const bad = result?.status !== 'ready' || result?.errors.length;
          return `<figure class="${theme}${bad ? ' bad' : ''}">${image ? `<img src="data:image/png;base64,${image}">` : ''}<figcaption>${theme} · ${result?.status}${result?.errors.length ? ` · ${result.errors.length} error(s)` : ''}</figcaption></figure>`;
        }),
      );
      return `<section><h2>${id}</h2>${cells.join('')}</section>`;
    }),
  );
  const page = await browser.newPage({ viewport: { width: 1060, height: 600 } });
  await page.setContent(
    `<style>body{margin:0;padding:12px;font:13px system-ui;background:#888}section{display:grid;grid-template-columns:repeat(2,480px);gap:8px 12px;margin-bottom:14px}h2{grid-column:1/-1;margin:0;font-size:14px}figure{margin:0;position:relative;outline:3px solid transparent}figure.dark{background:#0d0d10}figure.light{background:#f6f6f8}figure.bad{outline-color:#e11}img{display:block;width:480px;height:360px}figcaption{position:absolute;left:6px;bottom:4px;color:#999;font-size:11px}</style>${rows.join('')}`,
  );
  await page.screenshot({ path: path.join(out, `sheet-${sheet + 1}.png`), fullPage: true });
  await page.close();
}
await browser.close();
const bad = results.filter((r) => r.status !== 'ready' || r.errors.length);
console.log(
  `${results.length - bad.length}/${results.length} checks clean. Report: ${out}/report.json`,
);
process.exitCode = bad.length ? 1 : 0;
