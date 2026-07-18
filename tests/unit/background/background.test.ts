import { beforeEach, afterEach, describe, test, expect } from 'bun:test';
import {
  createChromeMock,
  resetChromeState,
  setStorageData,
  getTabsUpdateCalls,
  triggerTabsUpdated,
  type ChromeMock,
} from '../shared/chrome-mock';

declare const chrome: ChromeMock;

const bgModule = await import('../../../src/background');
const { init } = bgModule;

describe('background.ts', () => {
  beforeEach(() => {
    resetChromeState();
    (globalThis as typeof globalThis & { chrome: ChromeMock }).chrome = createChromeMock();
    bgModule.cachedData.blacklist = [];
    bgModule.cachedData.whitelist = [];
    bgModule.cachedData.active = true;
  });

  afterEach(() => {
    resetChromeState();
  });

  describe('init', () => {
    test('is a function', () => {
      expect(typeof init).toBe('function');
    });

    test('does not throw when called', () => {
      expect(() => init()).not.toThrow();
    });

    test('loads data from storage into cachedData', async () => {
      const testData = {
        blacklist: ['youtube.com'],
        whitelist: ['youtube.com/video'],
        active: true,
      };
      setStorageData('brostrict_data', testData);
      init();
      await new Promise((r) => setTimeout(r, 0));
      expect(bgModule.cachedData).toEqual(testData);
    });

    test('keeps defaults when storage has no data', async () => {
      init();
      await new Promise((r) => setTimeout(r, 0));
      expect(bgModule.cachedData).toEqual({
        blacklist: [],
        whitelist: [],
        active: true,
      });
    });

    test('ignores storage data that is not valid', async () => {
      setStorageData('brostrict_data', { blacklist: ['youtube.com'] });
      init();
      await new Promise((r) => setTimeout(r, 0));
      expect(bgModule.cachedData).toEqual({
        blacklist: [],
        whitelist: [],
        active: true,
      });
    });
  });

  describe('onMessage handler', () => {
    test('responds with whitelist for getWhitelist message', async () => {
      bgModule.cachedData.whitelist = ['youtube.com/video', 'youtube.com/yo'];
      const response = await chrome.runtime.sendMessage({ type: 'getWhitelist' });
      expect(response).toEqual({ whitelist: ['youtube.com/video', 'youtube.com/yo'] });
    });

    test('isWhitelisted returns true for matching URL', async () => {
      bgModule.cachedData.whitelist = ['youtube.com/video'];
      const response = await chrome.runtime.sendMessage({
        type: 'isWhitelisted',
        url: 'https://youtube.com/video',
      });
      expect(response).toEqual({ result: true });
    });

    test('isWhitelisted returns false for non-matching URL', async () => {
      bgModule.cachedData.whitelist = ['youtube.com/video'];
      const response = await chrome.runtime.sendMessage({
        type: 'isWhitelisted',
        url: 'https://youtube.com/watch',
      });
      expect(response).toEqual({ result: false });
    });

    test('isWhitelisted returns false when url is not a string', async () => {
      bgModule.cachedData.whitelist = ['youtube.com/video'];
      const response = await chrome.runtime.sendMessage({
        type: 'isWhitelisted',
      } as { type: string; url?: string });
      expect(response).toEqual({ result: false });
    });

    test('isWhitelisted returns false for empty whitelist', async () => {
      bgModule.cachedData.whitelist = [];
      const response = await chrome.runtime.sendMessage({
        type: 'isWhitelisted',
        url: 'https://youtube.com/video',
      });
      expect(response).toEqual({ result: false });
    });
  });

  describe('onChanged handler', () => {
    test('updates cachedData when valid storage data changes', async () => {
      const newData = {
        blacklist: ['test.com'],
        whitelist: ['test.com/path'],
        active: false,
      };
      await chrome.storage.local.set({ brostrict_data: newData });
      expect(bgModule.cachedData).toEqual(newData);
    });

    test('does not update cachedData when newValue is invalid', async () => {
      await chrome.storage.local.set({ brostrict_data: { blacklist: ['x'] } });
      expect(bgModule.cachedData).toEqual({
        blacklist: [],
        whitelist: [],
        active: true,
      });
    });

    test('ignores changes for other storage keys', async () => {
      await chrome.storage.local.set({ other_key: { stuff: 1 } });
      expect(bgModule.cachedData).toEqual({
        blacklist: [],
        whitelist: [],
        active: true,
      });
    });
  });

  describe('onUpdated handler', () => {
    test('does not block when protection is off', () => {
      bgModule.cachedData.active = false;
      bgModule.cachedData.blacklist = ['youtube.com'];

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('does not block when no URL is available', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];

      triggerTabsUpdated(1, {}, {});

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('does not block when URL is whitelisted', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = ['youtube.com/video'];

      triggerTabsUpdated(
        1,
        { url: 'https://youtube.com/video' },
        { url: 'https://youtube.com/video' },
      );

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('blocks when URL is blacklisted', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = [];

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });

      const calls = getTabsUpdateCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]!.tabId).toBe(1);
      expect(calls[0]!.options.url).toBe('chrome-extension://mock_id/blocked.html');
    });

    test('does not block when URL is not blacklisted', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = [];

      triggerTabsUpdated(1, { url: 'https://github.com' }, { url: 'https://github.com' });

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('uses changeInfo.url when tab.url is undefined', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = [];

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, {});

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });

    test('uses tab.url when changeInfo.url is undefined', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = [];

      triggerTabsUpdated(1, {}, { url: 'https://youtube.com' });

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });

    test('prefers changeInfo.url when both are available', () => {
      bgModule.cachedData.active = true;
      bgModule.cachedData.blacklist = ['youtube.com'];
      bgModule.cachedData.whitelist = [];

      triggerTabsUpdated(
        1,
        { url: 'https://youtube.com' },
        { url: 'https://not-blacklisted.com' },
      );

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });
  });
});
