import { test, expect } from '@playwright/test';
import { EXTENSION_PATH } from './helpers.mjs';

test.describe('Blocked Page', () => {
  test.beforeEach(async ({ context }) => {
    // n/a - each test creates its own page
  });

  test.afterEach(async ({ context }) => {
    for (const page of context.pages()) {
      await page.close().catch(() => {});
    }
  });

  test.describe('basic structure', () => {
    test('blocked page loads', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await expect(page.locator('h1')).toContainText('Bro-tervention');
    });

    test('shows go back button', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await expect(page.locator('#go-back-btn')).toBeVisible();
    });

    test('go back button links to touch grass search', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await expect(page.locator('#go-back-btn')).toHaveAttribute(
        'href',
        'https://www.google.com/search?q=touch+grass',
      );
    });
  });
});
