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
    await page.click(`.country-flag-button[data-country="${country}"]`);
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

  // DE betöltéskor teljes ország (ne az első csoport)
  const deActiveOnLoad = await page.locator('.range-button.is-active').count();
  if (deActiveOnLoad !== 0) throw new Error('DE betöltéskor aktív csoportszűrő volt (teljes országnak kellene lennie)');
  const deVisiblePaths = await page.evaluate(() => {
    return [...document.querySelectorAll('.leaflet-overlay-pane path')].filter((p) => {
      const fill = p.getAttribute('fill-opacity') || p.style.fillOpacity || '1';
      return Number(fill) > 0.05;
    }).length;
  });
  if (deVisiblePaths < 80) throw new Error(`DE teljes ország nézetben túl kevés látható zóna: ${deVisiblePaths}`);
  console.log('OK: DE teljes ország alapnézet', deVisiblePaths);

  await shot('IT', 'it-map.png');
  await shot('HU', 'hu-map.png');

  // Gyors országváltás – ne maradjon végtelen töltés
  await page.click('.country-flag-button[data-country="DE"]');
  await page.click('.country-flag-button[data-country="IT"]');
  await page.click('.country-flag-button[data-country="HU"]');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  console.log('OK: gyors országváltás');

  // DE: keresés kijelöl zónát, de NEM aktivál csoportszűrőt (alapból tiszta szűrők)
  await page.click('.country-flag-button[data-country="DE"]');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await page.click('#showAllButton');
  await wait(300);
  const noActiveRange = await page.locator('.range-button.is-active').count();
  if (noActiveRange !== 0) throw new Error('Teljes ország után maradt aktív csoport');
  await page.fill('#searchInput', '10115');
  await page.click('#searchButton');
  await wait(1500);
  const activeAfterSearch = await page.locator('.range-button.is-active').count();
  if (activeAfterSearch !== 0) throw new Error('DE keresés után csoportszűrő aktív lett (nem szabadna)');
  const selectedDe = (await page.locator('.quick-button.is-active').textContent())?.trim();
  if (selectedDe !== '10') throw new Error(`DE keresés nem jelölte a 10-es zónát: ${selectedDe}`);
  const placePin = await page.locator('.place-map-pin').count();
  if (placePin < 1) throw new Error('DE keresés után nincs helyjelölő a térképen');
  const mapsHref = await page.locator('#mapsLink').getAttribute('href');
  // Keresés = konkrét hely → tű (query=lat,lng). Zónakattintás = terület (map_action=map).
  if (!mapsHref || !/query=52\./.test(mapsHref)) {
    throw new Error(`DE keresés Maps link hibás (tű kell): ${mapsHref}`);
  }
  await page.click('.quick-button:text-is("10")');
  await wait(500);
  // Ugyanarra a gombra kattintás most TORLI a kijelölést — ezért előbb másikra, majd vissza 10-re.
  const cleared = await page.locator('.quick-button.is-active').count();
  if (cleared !== 0) throw new Error('DE 10-es gomb nem oldotta fel a kijelölést');
  await page.click('.quick-button:text-is("10")');
  await wait(500);
  const zoneHref = await page.locator('#mapsLink').getAttribute('href');
  if (!zoneHref || !/map_action=map/.test(zoneHref) || !/center=52\./.test(zoneHref)) {
    throw new Error(`DE zóna Maps link hibás (területnézet kell, tű nélkül): ${zoneHref}`);
  }
  // Váltás másik zónára gombbal (DE-ben nincs 11-es prefix → 12)
  await page.click('.quick-button:text-is("12")');
  await wait(400);
  const switched = (await page.locator('.quick-button.is-active').textContent())?.trim();
  if (switched !== '12') throw new Error(`Nem lehetett másik zónára váltani: ${switched}`);
  console.log('OK: keresés=tű, zóna=területnézet, váltás/törlés működik');

  // HU keresés
  await page.click('.country-flag-button[data-country="HU"]');
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await page.fill('#searchInput', '8600');
  await page.click('#searchButton');
  await wait(1200);
  const selected = (await page.locator('.quick-button.is-active').textContent())?.trim();
  if (selected !== '8') throw new Error(`HU keresés nem jelölte a 8-as zónát: ${selected}`);
  const huPin = await page.locator('.place-map-pin').count();
  if (huPin < 1) throw new Error('HU keresés után nincs helyjelölő');
  console.log('OK: HU keresés kijelölés + pin');

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
