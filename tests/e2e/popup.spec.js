import { test, expect } from '@playwright/test';
import { EXTENSION_PATH } from './helpers.mjs';

async function setupChromeMock(page, initialData = null) {
  await page.addInitScript((data) => {
    let _storage = {};

    if (data) {
      _storage['brostrict_data'] = data;
    }

    const _listeners = [];

    window.chrome = {
      storage: {
        local: {
          get: (key, callback) => {
            const result = {};
            if (typeof key === 'string') {
              result[key] = _storage[key] || null;
            } else if (Array.isArray(key)) {
              for (const k of key) {
                result[k] = _storage[k] || null;
              }
            } else if (key && typeof key === 'object') {
              Object.assign(result, key);
            }
            if (callback) {
              queueMicrotask(() => callback(result));
            }
            return Promise.resolve(result);
          },
          set: (data, callback) => {
            const changes = {};
            for (const [k, v] of Object.entries(data)) {
              _storage[k] = v;
              changes[k] = { newValue: v };
            }
            for (const cb of _listeners) {
              try { cb(changes); } catch {}
            }
            if (callback) {
              queueMicrotask(() => callback());
            }
            return Promise.resolve();
          },
          clear: () => Promise.resolve(),
          onChanged: {
            addListener: (cb) => { _listeners.push(cb); },
            removeListener: (cb) => {
              const idx = _listeners.indexOf(cb);
              if (idx !== -1) _listeners.splice(idx, 1);
            },
          },
        },
      },
    };
  }, initialData);
}

async function openPopup(page) {
  await page.goto(`file://${EXTENSION_PATH}/index.html`);
  await page.waitForSelector('#app .card', { timeout: 5000 });
  await page.waitForTimeout(200);
}

const getBlacklistCard = (page) => page.locator('.card').nth(1);
const getWhitelistCard = (page) => page.locator('.card').nth(2);

test.describe('Popup UI', () => {
  test.beforeEach(async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page);
    return { page };
  });

  test.afterEach(async ({ context }) => {
    for (const page of context.pages()) {
      await page.close().catch(() => {});
    }
  });

  test('popup HTML loads without crash', async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page);

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`file://${EXTENSION_PATH}/index.html`);
    await page.waitForSelector('#app', { timeout: 5000 });

    expect(errors.length).toBe(0);
  });

  test('shows Brostrict title in header', async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page);
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    await expect(page.locator('h1')).toContainText('Brostrict');
  });

  test('has app container div', async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page);
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    await expect(page.locator('#app')).toBeAttached();
  });

  test('loads the JavaScript bundle', async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page);
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const scriptTag = page.locator('script[src="index.js"]');
    await expect(scriptTag).toBeAttached();
  });

  test.describe('toggle on/off', () => {
    const makePage = async (context, active = true) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: [],
        whitelist: [],
        active: active,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('.toggle', { timeout: 5000 });
      return page;
    };

    test('shows toggle On by default', async ({ context }) => {
      const page = await makePage(context, true);
      await expect(page.locator('.toggle')).toContainText('On');
    });

    test('shows toggle Off when storage has active=false', async ({ context }) => {
      const page = await makePage(context, false);
      await expect(page.locator('.toggle')).toContainText('Off');
    });

    test('can toggle protection off', async ({ context }) => {
      const page = await makePage(context, true);
      await page.locator('.toggle').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.toggle')).toContainText('Off');
    });

    test('can toggle protection on', async ({ context }) => {
      const page = await makePage(context, false);
      await page.locator('.toggle').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.toggle')).toContainText('On');
    });

    test('toggle persists across re-render', async ({ context }) => {
      const page = await makePage(context, true);
      await page.locator('.toggle').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.toggle')).toContainText('Off');

      const storageAfter = await page.evaluate(() => {
        return window.chrome.storage.local.get('brostrict_data');
      });
      expect(storageAfter.brostrict_data.active).toBe(false);
    });
  });

  test.describe('blacklist management', () => {
    test('can input URL value to blacklist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page);
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#blacklist', { state: 'attached', timeout: 5000 });

      await getBlacklistCard(page).locator('input').fill('youtube.com');
      await getBlacklistCard(page).locator('button', { hasText: 'Ban' }).click();
      await page.waitForTimeout(300);

      await expect(page.locator('#blacklist .list-item')).toHaveCount(1);
      await expect(page.locator('#blacklist .list-item span')).toContainText('youtube.com');
    });

    test('can add multiple URLs to blacklist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page);
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#blacklist', { state: 'attached', timeout: 5000 });

      await getBlacklistCard(page).locator('input').fill('youtube.com');
      await getBlacklistCard(page).locator('button', { hasText: 'Ban' }).click();
      await page.waitForTimeout(200);

      await getBlacklistCard(page).locator('input').fill('facebook.com');
      await getBlacklistCard(page).locator('button', { hasText: 'Ban' }).click();
      await page.waitForTimeout(200);

      await expect(page.locator('#blacklist .list-item')).toHaveCount(2);
      await expect(page.locator('#blacklist .list-item span').first()).toContainText('youtube.com');
      await expect(page.locator('#blacklist .list-item span').last()).toContainText('facebook.com');
    });

    test('can remove URL from blacklist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: ['youtube.com', 'facebook.com'],
        whitelist: [],
        active: true,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#blacklist .list-item', { timeout: 5000 });

      await expect(page.locator('#blacklist .list-item')).toHaveCount(2);

      await page.locator('#blacklist .list-item').first().locator('.remove-btn').click();
      await page.waitForTimeout(300);

      await expect(page.locator('#blacklist .list-item')).toHaveCount(1);
      await expect(page.locator('#blacklist .list-item span')).toContainText('facebook.com');
    });

    test('can edit URL in blacklist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#blacklist .list-item', { timeout: 5000 });

      const item = page.locator('#blacklist .list-item').first();
      await expect(item.locator('span')).toContainText('youtube.com');

      await item.locator('.edit-btn').click();
      await page.waitForTimeout(200);

      await item.locator('.edit-input').fill('youtube2.com');
      await item.locator('.save-btn').click();
      await page.waitForTimeout(300);

      await expect(page.locator('#blacklist .list-item span').first()).toContainText('youtube2.com');
    });

    test('does not add duplicate to blacklist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#blacklist', { timeout: 5000 });

      await getBlacklistCard(page).locator('input').fill('youtube.com');
      await getBlacklistCard(page).locator('button', { hasText: 'Ban' }).click();
      await page.waitForTimeout(200);

      await expect(page.locator('#blacklist .list-item')).toHaveCount(1);
    });
  });

  test.describe('whitelist management', () => {
    test('can input URL value to whitelist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page);
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#whitelist', { state: 'attached', timeout: 5000 });

      await getWhitelistCard(page).locator('input').fill('youtube.com/video');
      await getWhitelistCard(page).locator('button', { hasText: 'Pass' }).click();
      await page.waitForTimeout(300);

      await expect(page.locator('#whitelist .list-item')).toHaveCount(1);
      await expect(page.locator('#whitelist .list-item span')).toContainText('youtube.com/video');
    });

    test('can remove URL from whitelist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: [],
        whitelist: ['youtube.com/video', 'facebook.com'],
        active: true,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#whitelist .list-item', { timeout: 5000 });

      await expect(page.locator('#whitelist .list-item')).toHaveCount(2);

      await page.locator('#whitelist .list-item').last().locator('.remove-btn').click();
      await page.waitForTimeout(300);

      await expect(page.locator('#whitelist .list-item')).toHaveCount(1);
      await expect(page.locator('#whitelist .list-item span')).toContainText('youtube.com/video');
    });

    test('can edit URL in whitelist', async ({ context }) => {
      const page = await context.newPage();
      await setupChromeMock(page, {
        blacklist: [],
        whitelist: ['youtube.com/video'],
        active: true,
      });
      await page.goto(`file://${EXTENSION_PATH}/index.html`);
      await page.waitForSelector('#whitelist .list-item', { timeout: 5000 });

      const item = page.locator('#whitelist .list-item').first();
      await expect(item.locator('span')).toContainText('youtube.com/video');

      await item.locator('.edit-btn').click();
      await page.waitForTimeout(200);

      await item.locator('.edit-input').fill('youtube.com/music');
      await item.locator('.save-btn').click();
      await page.waitForTimeout(300);

      await expect(page.locator('#whitelist .list-item span').first()).toContainText('youtube.com/music');
    });
  });

  test('shows blacklist and whitelist cards with preloaded data', async ({ context }) => {
    const page = await context.newPage();
    await setupChromeMock(page, {
      blacklist: ['youtube.com'],
      whitelist: ['youtube.com/yo'],
      active: true,
    });
    await page.goto(`file://${EXTENSION_PATH}/index.html`);
    await page.waitForSelector('#blacklist', { timeout: 5000 });
    await page.waitForSelector('#whitelist', { timeout: 5000 });

    await expect(page.locator('#blacklist')).toBeAttached();
    await expect(page.locator('#whitelist')).toBeAttached();

    await expect(page.locator('#blacklist .list-item span')).toContainText('youtube.com');
    await expect(page.locator('#whitelist .list-item span')).toContainText('youtube.com/yo');
  });
});