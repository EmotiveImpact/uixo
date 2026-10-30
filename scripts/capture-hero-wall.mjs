// Captures the homepage wall from real catalogue demos, so each tile shows a component
// UIXO lists and links to its page. Run with the dev server and registry up:
//   node scripts/capture-hero-wall.mjs [http://127.0.0.1:3000] [chromium path]
// Writes public/hero-wall/<id>-<theme>.webp and src/lib/hero-wall.json.
// The page callbacks below run in the browser.
/* global window, document, Image */
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const REGISTRY = process.env.UIXO_REGISTRY_URL ?? 'http://127.0.0.1:4175';
const EXECUTABLE = process.argv[3] ?? process.env.CHROMIUM_EXECUTABLE;
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(PLAYWRIGHT);

// Small, legible components from four libraries. Full-bleed backgrounds blur at tile size.
const IDS = [
  'magic-ui/shimmer-button',
  'magic-ui/word-rotate',
  'magic-ui/dock',
  'motion-primitives/text-effect',
  'shadcn/switch',
  'magic-ui/aurora-text',
  'shadcn/input-otp',
  'magic-ui/animated-subscribe-button',
  'shadcn/slider',
  'magic-ui/number-ticker',
  'shadcn/button',
  'motion-primitives/text-shimmer',
  'magic-ui/rainbow-button',
  'magic-ui/hyper-text',
  'magic-ui/pulsating-button',
  'shadcn/progress',
  'motion-primitives/sliding-number',
  'shadcn/badge',
  'magic-ui/interactive-hover-button',
  'shadcn/toggle-group',
  'magic-ui/typing-animation',
  'motion-primitives/text-scramble',
  'motion-primitives/text-roll',
  'magic-ui/ripple',
];
const VIEW = { width: 480, height: 360 };
const TILE = { width: 360, height: 270 };

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const out = new URL('../public/hero-wall/', import.meta.url);
await mkdir(out, { recursive: true });
const encoder = await browser.newPage();
const tiles = [];

for (const id of IDS) {
  const response = await fetch(
    `${REGISTRY}/api/registry?action=asset&id=${encodeURIComponent(id)}`,
  );
  if (!response.ok) throw new Error(`${id}: the registry answered ${response.status}`);
  const asset = await response.json();
  const providers = await (await fetch(`${REGISTRY}/api/registry?action=providers`)).json();
  const provider = providers.items.find((item) => item.id === asset.providerId)?.name;
  const file = id.replace('/', '--');
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
    await page.addInitScript(() => {
      window.__uixo = { status: '', box: null };
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'uixo-preview-status') window.__uixo.status = event.data.status;
        if (event.data?.type === 'uixo-preview-size') window.__uixo.box = event.data.box;
      });
    });
    await page.goto(
      `${BASE}/live-demos/index.html?id=${encodeURIComponent(id)}&theme=${theme}&stage=clear`,
    );
    await page.waitForFunction(() => window.__uixo.status === 'ready', null, { timeout: 30000 });
    // Let entrance animations settle; the size report repeats until 3.2s.
    await page.waitForTimeout(3600);
    const box = await page.evaluate(() => window.__uixo.box);
    const png = await page.screenshot({ omitBackground: true });
    await page.close();
    const webp = await encoder.evaluate(
      async ({ data, box, view, tile }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = tile.width * 2;
        canvas.height = tile.height * 2;
        const context = canvas.getContext('2d');
        const area = box ?? { x: 0, y: 0, width: view.width, height: view.height };
        // Small content grows to about 70% of the tile; large content fits the tile.
        const scale = Math.min(
          2.4,
          (tile.width * 0.7) / Math.max(area.width, 1),
          (tile.height * 0.62) / Math.max(area.height, 1),
          Math.max(tile.width / view.width, tile.height / view.height) * 1.6,
        );
        const cx = area.x + area.width / 2;
        const cy = area.y + area.height / 2;
        context.setTransform(2 * scale, 0, 0, 2 * scale, 0, 0);
        context.translate(tile.width / 2 / scale - cx, tile.height / 2 / scale - cy);
        context.drawImage(image, 0, 0, view.width, view.height);
        return canvas.toDataURL('image/webp', 0.82).split(',')[1];
      },
      { data: png.toString('base64'), box, view: VIEW, tile: TILE },
    );
    await writeFile(new URL(`${file}-${theme}.webp`, out), Buffer.from(webp, 'base64'));
  }
  tiles.push({ id, name: asset.name, provider: provider ?? asset.providerId, file });
  console.log(`captured ${id}`);
}

await writeFile(
  new URL('../src/lib/hero-wall.json', import.meta.url),
  `${JSON.stringify(tiles, null, 2)}\n`,
);
await browser.close();
