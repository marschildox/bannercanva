import { chromium } from 'playwright-core';
const shots = new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bannercanva-welcome-seen-v1','true'); });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Banner Generator', { timeout: 30000 });
await page.waitForTimeout(2500);
for (const s of ['Skyscraper', 'Story', 'Large Leaderboard', 'Portrait']) {
  await page.click(`button:has-text("${s}")`); await page.waitForTimeout(1200);
}
await page.click('button:has-text("Export Preview")');
await page.waitForTimeout(3500);
await page.screenshot({ path: shots + 'export-final.png' });

// Download the whole batch
const btn = page.locator('[role="dialog"] button', { hasText: /^Export \(/ }).last();
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 120000 }),
  btn.click({ force: true }),
]);
const path = shots + 'batch.zip';
await dl.saveAs(path);
const { statSync } = await import('node:fs');
console.log('downloaded:', dl.suggestedFilename(), statSync(path).size, 'bytes');
console.log('errors:', errors.length ? errors.slice(0,4) : 'none');
await browser.close();
