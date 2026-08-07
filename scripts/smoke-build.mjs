/**
 * Production-build smoke test.
 *
 * `vite build` succeeding does not mean the bundle runs: a bad chunk split once
 * shipped a blank page to production (Radix evaluated before React, so
 * `React.forwardRef` was undefined) while dev and the type checker were both
 * green. This serves the real `dist/` output in a real browser and fails if the
 * app doesn't mount or anything throws.
 *
 * Usage: npm run build && npm run smoke
 */
import { preview } from 'vite';
import { chromium } from 'playwright';

const PORT = 4188;

const server = await preview({
  preview: { port: PORT, strictPort: true, open: false },
  logLevel: 'warn',
});

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
});

const failures = [];
try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 30_000 });

  // The app must actually mount, not just serve HTML.
  await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, {
    timeout: 20_000,
  });
  await page.waitForTimeout(2500);

  const rootSize = await page.evaluate(() => document.getElementById('root').innerHTML.length);
  if (rootSize < 1000) failures.push(`#root rendered only ${rootSize} chars of HTML`);

  // Dismiss the welcome page, then confirm the board itself renders.
  if (await page.locator('text=Design one banner.').count()) {
    await page.click('button:has-text("Open the editor")');
    await page.waitForTimeout(2500);
  }
  const banners = await page.locator('[data-banner-id]').count();
  if (banners < 1) failures.push('no banners rendered on the board');

  if (errors.length) failures.push(...errors);
} catch (error) {
  failures.push(`navigation/mount failed: ${error.message}`);
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error('✗ production build smoke test failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('✓ production build mounts and renders with no errors');
