import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = process.env.SMOKE_URL || 'https://ftrans-iranyitoszam-terkep-v3-test.zoltan-toth.workers.dev';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join('/opt/cursor/artifacts/screenshots');
fs.mkdirSync(out, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME || '/usr/local/bin/google-chrome'
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  const version = await (await fetch(`${base}/__version`)).json();
  if (version.version !== '3.3.26') throw new Error(`verzió: ${JSON.stringify(version)}`);
  console.log('OK version', version.version);

  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 45000 });
  await page.screenshot({ path: path.join(out, 'v332-hu.png'), fullPage: true });
  console.log('OK HU loaded');

  await page.click('.country-flag-button[data-country="DE"]');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 45000 });
  await wait(900);
  const active = await page.locator('.range-button.is-active').count();
  if (active !== 0) throw new Error(`DE alapból aktív csoport: ${active}`);
  const deLayer = await page.evaluate(() => ({
    paths: [...document.querySelectorAll('.leaflet-overlay-pane path')]
      .filter((p) => Number(p.getAttribute('fill-opacity') || 1) > 0.05).length,
    canvases: document.querySelectorAll('.leaflet-overlay-pane canvas').length,
    quick: document.querySelectorAll('.quick-button').length
  }));
  if (deLayer.paths < 80 && (deLayer.canvases < 1 || deLayer.quick < 80)) {
    throw new Error(`DE túl kevés látható zóna: ${JSON.stringify(deLayer)}`);
  }
  await page.screenshot({ path: path.join(out, 'v332-de-full.png'), fullPage: true });
  console.log('OK DE full country', deLayer);

  await page.locator('.range-button', { hasText: '01–10' }).click();
  await wait(700);
  const filtered = await page.evaluate(() => ({
    paths: [...document.querySelectorAll('.leaflet-overlay-pane path')]
      .filter((p) => Number(p.getAttribute('fill-opacity') || 1) > 0.05).length,
    quick: document.querySelectorAll('.quick-button').length,
    activeRanges: document.querySelectorAll('.range-button.is-active').length
  }));
  if (filtered.activeRanges < 1) throw new Error('DE 01–10 szűrés nem aktív');
  if (filtered.quick > 15) throw new Error(`DE 01–10 szűrés után túl sok gyorsgomb: ${filtered.quick}`);
  await page.screenshot({ path: path.join(out, 'v332-de-01-10.png'), fullPage: true });
  console.log('OK DE filtered', filtered);

  await page.click('#showAllButton');
  await wait(400);
  await page.fill('#searchInput', '10115');
  await page.click('#searchButton');
  await wait(1800);
  const pin = await page.locator('.place-map-pin').count();
  if (pin < 1) throw new Error('nincs helyjelölő DE keresés után');
  await page.screenshot({ path: path.join(out, 'v332-de-search-10115.png'), fullPage: true });
  console.log('OK DE search pin');

  await page.click('.country-flag-button[data-country="IT"]');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 45000 });
  await wait(900);
  const itActive = await page.locator('.range-button.is-active').count();
  if (itActive !== 0) throw new Error('IT alapból aktív csoport');
  await page.screenshot({ path: path.join(out, 'v332-it-full.png'), fullPage: true });
  console.log('OK IT full');

  if (errors.length) console.warn('page errors', errors.slice(0, 5));
  console.log('REMOTE SMOKE OK');
} catch (error) {
  console.error('REMOTE SMOKE FAILED', error);
  try { await page.screenshot({ path: path.join(out, 'v332-fail.png'), fullPage: true }); } catch {}
  process.exitCode = 1;
} finally {
  await browser.close();
}
