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

    test('notice is hidden by default', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      const notice = page.locator('#notice');
      await expect(notice).toHaveCSS('display', 'none');
    });

    test('proceed button is hidden by default', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      const proceedBtn = page.locator('#proceed-btn');
      await expect(proceedBtn).toBeHidden();
    });
  });

  test.describe('whitelist override', () => {
    test('proceed button appears when blocked URL is whitelisted', async ({ context }) => {
      const page = await context.newPage();

      await page.addInitScript(() => {
        let _listeners = [];

        Object.defineProperty(document, 'referrer', {
          value: 'https://www.youtube.com/yo',
          writable: true,
          configurable: true,
        });

        window.chrome = {
          runtime: {
            sendMessage: (message, callback) => {
              if (message.type === 'isWhitelisted' && message.url === 'https://www.youtube.com/yo') {
                if (callback) queueMicrotask(() => callback({ result: true }));
              }
            },
          },
        };
      });

      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await page.waitForTimeout(500);

      const notice = page.locator('#notice');
      const proceedBtn = page.locator('#proceed-btn');

      await expect(proceedBtn).toBeVisible();
      await expect(notice).toBeVisible();
    });

    test('proceed button stays hidden when URL is not whitelisted', async ({ context }) => {
      const page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(document, 'referrer', {
          value: 'https://youtube.com/blocked',
          writable: true,
          configurable: true,
        });

        window.chrome = {
          runtime: {
            sendMessage: (message, callback) => {
              if (message.type === 'isWhitelisted') {
                if (callback) queueMicrotask(() => callback({ result: false }));
              }
            },
          },
        };
      });

      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await page.waitForTimeout(500);

      const proceedBtn = page.locator('#proceed-btn');
      await expect(proceedBtn).toBeHidden();
    });

    test('proceed button works with www prefix in whitelist', async ({ context }) => {
      const page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(document, 'referrer', {
          value: 'https://www.youtube.com/yo',
          writable: true,
          configurable: true,
        });

        window.chrome = {
          runtime: {
            sendMessage: (message, callback) => {
              if (message.type === 'isWhitelisted' && message.url === 'https://www.youtube.com/yo') {
                if (callback) queueMicrotask(() => callback({ result: true }));
              }
            },
          },
        };
      });

      await page.goto(`file://${EXTENSION_PATH}/blocked.html`);
      await page.waitForTimeout(500);

      await expect(page.locator('#proceed-btn')).toBeVisible();
      await expect(page.locator('#proceed-btn')).toHaveText('Bet, Watch Me');
    });
  });
});