import { test, expect } from '@playwright/test';
import { EXTENSION_PATH, clearExtensionStorage } from './helpers.cjs';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ context }) => {
    await clearExtensionStorage(context);
    await context.newPage();
  });

  test.afterEach(async ({ context }) => {
    const pages = context.pages();
    for (const page of pages) {
      await page.close();
    }
  });

  test('popup loads without errors', async ({ context }) => {
    const page = await context.newPage();
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    await expect(page.locator('.container')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('shows protection toggle', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const protectionCard = page.locator('.card').first();
    await expect(protectionCard).toBeVisible();
    await expect(protectionCard.locator('h3')).toHaveText('Protection');
  });

  test('protection toggle works', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const toggle = page.locator('.card').first().locator('button.toggle');

    const initialState = await toggle.textContent();
    expect(initialState).toBe('On');

    await toggle.click();

    const newState = await toggle.textContent();
    expect(newState).toBe('Off');
  });

  test('shows blacklist section', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const blacklistCard = page.locator('#blacklist').locator('..');
    await expect(blacklistCard.locator('h3')).toHaveText('Blacklist');
    await expect(blacklistCard.locator('input')).toBeVisible();
    await expect(blacklistCard.locator('button')).toHaveText('Add');
  });

  test('shows whitelist section', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const whitelistCard = page.locator('#whitelist').locator('..');
    await expect(whitelistCard.locator('h3')).toHaveText('Whitelist');
    await expect(whitelistCard.locator('input')).toBeVisible();
    await expect(whitelistCard.locator('button')).toHaveText('Add');
  });

  test('add item to blacklist', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('youtube.com');
    await addBtn.click();

    const listItem = page.locator('#blacklist').locator('li').first();
    await expect(listItem.locator('span')).toHaveText('youtube.com');
  });

  test('add item to whitelist', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#whitelist').locator('input');
    const addBtn = page.locator('#whitelist').locator('button');

    await input.fill('youtube.com/video');
    await addBtn.click();

    const listItem = page.locator('#whitelist').locator('li').first();
    await expect(listItem.locator('span')).toHaveText('youtube.com/video');
  });

  test('remove item from blacklist', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('youtube.com');
    await addBtn.click();

    const listItem = page.locator('#blacklist').locator('li').first();
    const removeBtn = listItem.locator('.remove-btn');

    await removeBtn.click();

    const items = page.locator('#blacklist').locator('li');
    await expect(items).toHaveCount(0);
  });

  test('edit item in blacklist', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('youtube.com');
    await addBtn.click();

    const listItem = page.locator('#blacklist').locator('li').first();
    const editBtn = listItem.locator('.edit-btn');
    await editBtn.click();

    const editInput = listItem.locator('.edit-input');
    await editInput.clear();
    await editInput.fill('facebook.com');

    const saveBtn = listItem.locator('.save-btn');
    await saveBtn.click();

    await expect(listItem.locator('span')).toHaveText('facebook.com');
  });

  test('duplicate entry shows no error message by default', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('youtube.com');
    await addBtn.click();

    await input.fill('youtube.com');
    await addBtn.click();

    const items = page.locator('#blacklist').locator('li');
    await expect(items).toHaveCount(1);
  });

  test('empty entry is not added', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('   ');
    await addBtn.click();

    const items = page.locator('#blacklist').locator('li');
    await expect(items).toHaveCount(0);
  });

  test('add multiple items to blacklist', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const input = page.locator('#blacklist').locator('input');
    const addBtn = page.locator('#blacklist').locator('button');

    await input.fill('youtube.com');
    await addBtn.click();

    await input.fill('facebook.com');
    await addBtn.click();

    await input.fill('twitter.com');
    await addBtn.click();

    const items = page.locator('#blacklist').locator('li');
    await expect(items).toHaveCount(3);
  });

  test('toggle protection off persists', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(`file://${EXTENSION_PATH}/index.html`);

    const toggle = page.locator('.card').first().locator('button.toggle');
    await toggle.click();

    const newPage = await context.newPage();
    await newPage.goto(`file://${EXTENSION_PATH}/index.html`);

    const newToggle = newPage.locator('.card').first().locator('button.toggle');
    await expect(newToggle).toHaveText('Off');
  });
});
