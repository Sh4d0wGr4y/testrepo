import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error(`A helyi szerver nem indult el: ${url}`);
}

const wrangler = spawn('npx', ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', '8787'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '0' }
});

let output = '';
wrangler.stdout.on('data', (chunk) => { output += chunk.toString(); });
wrangler.stderr.on('data', (chunk) => { output += chunk.toString(); });

const base = 'http://127.0.0.1:8787';

try {
  await waitForServer(`${base}/__health`);
  const health = await (await fetch(`${base}/__health`)).json();
  if (!health.ok) {
    throw new Error(`Health nem ok: ${JSON.stringify(health)}`);
  }
  console.log('OK: /__health', health.version, health.countries);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME || '/usr/local/bin/google-chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const loading = document.getElementById('mapLoading');
    return loading && loading.hidden === true;
  }, null, { timeout: 30000 });

  async function shot(country, filename) {
    await page.selectOption('#countrySelect', country);
    await page.waitForFunction(() => {
      const loading = document.getElementById('mapLoading');
      return loading && loading.hidden === true;
    }, null, { timeout: 30000 });
    await wait(800);
    const paths = await page.locator('.leaflet-overlay-pane path').count();
    if (paths < 1) throw new Error(`${country}: nincs zónapoligon a térképen`);
    await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
    console.log(`OK: ${country} screenshot (${paths} path)`);
  }

  await page.screenshot({ path: path.join(artifacts, 'hu-initial.png'), fullPage: true });
  await shot('DE', 'de-map.png');
  await shot('IT', 'it-map.png');
  await shot('HU', 'hu-map.png');

  // Gyors országváltás – ne maradjon végtelen töltés
  await page.selectOption('#countrySelect', 'DE');
  await page.selectOption('#countrySelect', 'IT');
  await page.selectOption('#countrySelect', 'HU');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  console.log('OK: gyors országváltás');

  // DE: Teljes ország után keresés aktiválja a csoportot
  await page.selectOption('#countrySelect', 'DE');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await page.click('#showAllButton');
  await wait(300);
  const noActiveRange = await page.locator('.range-button.is-active').count();
  if (noActiveRange !== 0) throw new Error('Teljes ország után maradt aktív csoport');
  await page.fill('#searchInput', '10115');
  await page.click('#searchButton');
  await wait(1500);
  const activeLabel = (await page.locator('.range-button.is-active').textContent())?.trim();
  if (activeLabel !== '01–10') throw new Error(`DE keresés nem aktiválta a 01–10 csoportot: ${activeLabel}`);
  const selectedDe = (await page.locator('.quick-button.is-active').textContent())?.trim();
  if (selectedDe !== '10') throw new Error(`DE keresés nem jelölte a 10-es zónát: ${selectedDe}`);
  console.log('OK: Teljes ország utáni keresés aktivál csoportot');

  // HU keresés
  await page.selectOption('#countrySelect', 'HU');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await page.fill('#searchInput', '8600');
  await page.click('#searchButton');
  await wait(1200);
  const selected = (await page.locator('.quick-button.is-active').textContent())?.trim();
  if (selected !== '8') throw new Error(`HU keresés nem jelölte a 8-as zónát: ${selected}`);
  console.log('OK: HU keresés kijelölés');

  if (consoleErrors.length) {
    console.warn('Console errors:', consoleErrors.slice(0, 5));
  }

  await browser.close();
  console.log('Böngészős smoke teszt sikeres.');
} catch (error) {
  console.error('Browser smoke FAILED:', error);
  console.error('Wrangler output tail:\n', output.slice(-4000));
  process.exitCode = 1;
} finally {
  try { wrangler.kill('SIGTERM'); } catch {}
  setTimeout(() => {
    try { wrangler.kill('SIGKILL'); } catch {}
    process.exit(process.exitCode || 0);
  }, 1000);
}
