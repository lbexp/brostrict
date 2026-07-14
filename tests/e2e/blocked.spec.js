import { test, expect } from '@playwright/test';
import { EXTENSION_PATH } from './helpers.cjs';

test.describe('Blocked Page', () => {
  test.beforeEach(async ({ context }) => {
    const pages = context.pages();
    for (const page of pages) {
      await page.close();
    }
  });

  test('blocked page loads', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await expect(page.locator('h1')).toHaveText('Blocked');
    await expect(page.locator('#go-back-btn')).toBeVisible();
  });

  test('shows proceed button for whitelisted URL', async ({ context }) => {
    const page = await context.newPage();

    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await page.evaluate(() => {
      Object.defineProperty(window, 'location', {
        value: {
          ancestorOrigins: { length: 1, 0: 'https://youtube.com/video' },
        },
        writable: true,
      });
    });

    await page.reload();

    await page.waitForTimeout(500);

    const proceedBtn = page.locator('#proceed-btn');
    await expect(proceedBtn).toBeVisible();
  });

  test('proceed button navigates to URL', async ({ context }) => {
    const page = await context.newPage();

    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await page.evaluate(() => {
      Object.defineProperty(window, 'location', {
        value: {
          ancestorOrigins: { length: 1, 0: 'https://youtube.com/video' },
        },
        writable: true,
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    const proceedBtn = page.locator('#proceed-btn');
    await proceedBtn.click();

    await page.waitForTimeout(500);
  });

  test('go back button exists', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    const goBackBtn = page.locator('#go-back-btn');
    await expect(goBackBtn).toBeVisible();
  });

  test('notice is hidden by default', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    const notice = page.locator('#notice');
    await expect(notice).toBeHidden();
  });

  test('shows notice for whitelisted URL', async ({ context }) => {
    const page = await context.newPage();

    await page.goto(`file://${EXTENSION_PATH}/blocked.html`);

    await page.evaluate(() => {
      Object.defineProperty(window, 'location', {
        value: {
          ancestorOrigins: { length: 1, 0: 'https://youtube.com/video' },
        },
        writable: true,
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    const notice = page.locator('#notice');
    await expect(notice).toBeVisible();
  });
});
