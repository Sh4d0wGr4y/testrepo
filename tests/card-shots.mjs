import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = '/opt/cursor/artifacts/screenshots';

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await wait(500);
  }
  throw new Error('no server');
}

const wrangler = spawn('npx', ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', '8787'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0' }
});

try {
  await waitForServer('http://127.0.0.1:8787/__health');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROME || '/usr/local/bin/google-chrome' });

  // Desktop
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:8787', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await page.click('.quick-button:text-is("3")');
  await wait(1400);
  await page.screenshot({ path: path.join(out, 'v3345-card-desktop.png') });

  // Mobile (iPhone-szerű)
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mp.goto('http://127.0.0.1:8787', { waitUntil: 'networkidle' });
  await mp.waitForFunction(() => document.getElementById('mapLoading')?.hidden === true, null, { timeout: 30000 });
  await mp.evaluate(() => {
    const btn = [...document.querySelectorAll('.quick-button')].find((b) => b.textContent.trim() === '3');
    if (btn) btn.click();
  });
  await wait(1400);
  await mp.screenshot({ path: path.join(out, 'v3345-card-mobile.png') });

  await browser.close();
  console.log('shots done');
} finally {
  wrangler.kill('SIGKILL');
}
