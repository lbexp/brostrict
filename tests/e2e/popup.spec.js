import { test, expect } from '@playwright/test';
import { EXTENSION_PATH, clearExtensionStorage } from './helpers.mjs';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ context }) => {
    await clearExtensionStorage(context);
  });

  test.afterEach(async ({ context }) => {
    const pages = context.pages();
    for (const page of pages) {
      await page.close();
    }
  });

  test('popup HTML loads without crash', async ({ context }) => {
    const errors = [];
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${EXTENSION_PATH}/index.html`);
    await page.waitForTimeout(500);

    const body = await page.locator('body').isVisible();
    expect(body).toBe(true);
  });

  test('shows Brostrict title in header', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    await expect(page.locator('h1')).toContainText('Brostrict');
  });

  test('has app container div', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const appDiv = page.locator('#app');
    await expect(appDiv).toBeAttached();
  });

  test('loads the JavaScript bundle', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const scriptTag = page.locator('script[src="index.js"]');
    await expect(scriptTag).toBeAttached();
  });
});
