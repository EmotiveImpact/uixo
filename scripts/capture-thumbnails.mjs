/**
 * Capture desktop website previews in the same shape UIXO renders them.
 *
 * Usage:
 *   npm run screenshots:capture -- grainient=https://grainient.supply/collections
 *   npm run screenshots:capture -- grainient=https://... shadcn=https://...
 *
 * Chrome captures a real 1280 x 960 desktop viewport. That 4:3 source is close to the
 * directory card's 1.3 aspect ratio, so `object-fit: cover` only trims a few pixels instead
 * of magnifying a 16:9 or phone-sized capture and showing one corner of the page.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VIEWPORT = { width: 1280, height: 960 };
const WEBP_WIDTHS = [400, 800];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = join(root, 'public/assets');
const responsiveDir = join(assetDir, 'w');

function findChrome() {
  const configured = process.env.UIXO_CHROME_PATH;
  const candidates = [
    configured,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      'Chrome or Chromium was not found. Set UIXO_CHROME_PATH to the browser executable.',
    );
  }
  return found;
}

function parseTargets(values) {
  if (values.length === 0) {
    throw new Error('Pass at least one target as <resource-id>=<https-url>.');
  }

  return values.map((value) => {
    const equals = value.indexOf('=');
    if (equals < 1) throw new Error(`Invalid target "${value}". Use <resource-id>=<https-url>.`);

    const id = value.slice(0, equals);
    const url = value.slice(equals + 1);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid resource id "${id}".`);

    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`Invalid URL for ${id}: only HTTP(S) URLs can be captured.`);
    }
    return { id, url: parsed.href };
  });
}

function pngDimensions(path) {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${basename(path)} is not a real PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function capture(chrome, target) {
  const output = join(assetDir, `${target.id}.png`);
  const profile = mkdtempSync(join(tmpdir(), `uixo-capture-${target.id}-`));
  const captured = join(profile, `${target.id}.png`);

  try {
    const result = spawnSync(
      chrome,
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
        '--run-all-compositor-stages-before-draw',
        '--timeout=8000',
        `--user-data-dir=${profile}`,
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
        `--screenshot=${captured}`,
        target.url,
      ],
      { encoding: 'utf8', timeout: 25_000 },
    );

    // Some animation-heavy sites keep a Chrome helper alive after the screenshot is
    // complete. spawnSync then reports ETIMEDOUT even though Chrome wrote a valid image.
    // The file signature and exact dimensions below are the authoritative success check.
    if (!existsSync(captured)) {
      if (result.error) throw result.error;
      throw new Error(result.stderr.trim() || `Chrome exited with status ${result.status}.`);
    }

    const dimensions = pngDimensions(captured);
    if (dimensions.width !== VIEWPORT.width || dimensions.height !== VIEWPORT.height) {
      throw new Error(
        `${target.id} captured at ${dimensions.width}x${dimensions.height}; expected ${VIEWPORT.width}x${VIEWPORT.height}.`,
      );
    }

    // A browser can technically succeed before a client-rendered page has painted. A
    // nearly empty 1280x960 PNG is a reliable sign of that failure. Keep the current live
    // assets untouched and ask for a retry instead of replacing them with a blank frame.
    if (statSync(captured).size < 10_000) {
      throw new Error(`${target.id} produced a nearly blank capture; the previous assets remain.`);
    }

    const responsiveCaptures = WEBP_WIDTHS.map((width) => {
      const responsiveName = `${target.id}-${width}.webp`;
      const responsiveCapture = join(profile, responsiveName);
      execFileSync('cwebp', [
        '-quiet',
        '-q',
        '78',
        '-resize',
        String(width),
        '0',
        captured,
        '-o',
        responsiveCapture,
      ]);
      if (statSync(responsiveCapture).size < 200) {
        throw new Error(`${responsiveName} is unexpectedly small; the previous assets remain.`);
      }
      return { responsiveCapture, responsiveName };
    });

    // Do not touch the existing files until the screenshot and both conversions pass.
    // This prevents a capture or codec failure from damaging a good card.
    for (const item of responsiveCaptures) {
      renameSync(item.responsiveCapture, join(responsiveDir, item.responsiveName));
    }
    renameSync(captured, output);

    console.log(`${target.id}: ${dimensions.width}x${dimensions.height} PNG + 400/800px WebP`);
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

mkdirSync(assetDir, { recursive: true });
mkdirSync(responsiveDir, { recursive: true });

const targets = parseTargets(process.argv.slice(2));
const chrome = findChrome();
for (const target of targets) capture(chrome, target);
