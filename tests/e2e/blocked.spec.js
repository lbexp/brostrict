import { test, expect } from '@playwright/test';
import { EXTENSION_PATH } from './helpers.mjs';

test.describe('Blocked Page', () => {
  test('blocked page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await expect(page.locator('h1')).toContainText('Blocked');
  });

  test('shows go back button', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await expect(page.locator('#go-back-btn')).toBeVisible();
  });

  test('notice is hidden by default', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    const notice = page.locator('#notice');
    await expect(notice).toBeHidden();
  });

  test('proceed button is hidden by default', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    const proceedBtn = page.locator('#proceed-btn');
    await expect(proceedBtn).toBeHidden();
  });
});
