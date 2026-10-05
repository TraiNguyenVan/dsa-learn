import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = '/home/trai/Work/tries/2026-10-05-dsa-learn/dsa-learn/frontend/dist';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let p = join(DIST, decodeURIComponent(url.pathname));
    let body;
    try { body = await readFile(p); } catch { p = join(DIST, 'index.html'); body = await readFile(p); }
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise((r) => server.listen(8931, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
await page.goto('http://127.0.0.1:8931/', { waitUntil: 'domcontentloaded' });

const trigger = page.locator('button[title="Keyboard shortcuts"]');
await trigger.waitFor({ timeout: 20000 });

const rect = (loc) => loc.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
});

const results = {};
results.viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
results.headerHeight = (await rect(page.locator('header'))).h;

// --- open via the trigger
await trigger.click();
const dialog = page.locator('[role="dialog"]');
await dialog.waitFor();
const overlay = page.locator('[role="dialog"]').locator('xpath=..');
const close = page.locator('[aria-label="Close keyboard shortcuts"]');

results.open = {
  overlay: await rect(overlay),
  dialog: await rect(dialog),
  close: await rect(close),
  dialogParent: await page.locator('[role="dialog"]').evaluate((el) => el.parentElement?.parentElement?.tagName + '.' + (el.parentElement?.parentElement?.className || '')),
  focusedOnOpen: await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
};
results.open.fullyInViewport =
  results.open.dialog.top >= 0 && results.open.dialog.bottom <= results.viewport.h &&
  results.open.close.top >= 0 && results.open.close.bottom <= results.viewport.h;
results.open.overlayCoversViewport = results.open.overlay.h === results.viewport.h && results.open.overlay.w === results.viewport.w;
await page.screenshot({ path: '/tmp/opencode/fixed-open.png' });

// --- close via the ✕
await close.click();
results.closeViaX = { dialogCount: await page.locator('[role="dialog"]').count(), focusAfter: await page.evaluate(() => document.activeElement?.getAttribute('title')) };

// --- close via Escape
await trigger.click();
await page.locator('[role="dialog"]').waitFor();
await page.keyboard.press('Escape');
results.closeViaEscape = { dialogCount: await page.locator('[role="dialog"]').count() };

// --- close via backdrop click
await trigger.click();
await page.locator('[role="dialog"]').waitFor();
await page.mouse.click(5, 400);
results.closeViaBackdrop = { dialogCount: await page.locator('[role="dialog"]').count() };

// --- clicking inside the card must NOT close it
await trigger.click();
await page.locator('[role="dialog"]').waitFor();
await page.locator('[role="dialog"] kbd').first().click();
results.clickInsideKeepsOpen = { dialogCount: await page.locator('[role="dialog"]').count() };
await page.screenshot({ path: '/tmp/opencode/fixed-open2.png' });
await page.keyboard.press('Escape');

results.pageErrors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
