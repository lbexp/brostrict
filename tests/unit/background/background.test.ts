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

// Importing the module registers the tabs.onUpdated listener.
await import('../../../src/background');

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('background.ts', () => {
  beforeEach(() => {
    resetChromeState();
    (globalThis as typeof globalThis & { chrome: ChromeMock }).chrome = createChromeMock();
  });

  afterEach(() => {
    resetChromeState();
  });

  describe('onUpdated handler', () => {
    test('does not block when protection is off', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: false,
      });

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('does not block when no URL is available', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(1, {}, {});
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('does not block when URL is whitelisted', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: ['youtube.com/video'],
        active: true,
      });

      triggerTabsUpdated(
        1,
        { url: 'https://youtube.com/video' },
        { url: 'https://youtube.com/video' },
      );
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('blocks when URL is blacklisted', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });
      await flush();

      const calls = getTabsUpdateCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]!.tabId).toBe(1);
      expect(calls[0]!.options.url).toBe('chrome-extension://mock_id/blocked.html');
    });

    test('does not block when URL is not blacklisted', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(1, { url: 'https://github.com' }, { url: 'https://github.com' });
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('uses changeInfo.url when tab.url is undefined', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, {});
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });

    test('uses tab.url when changeInfo.url is undefined', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(1, {}, { url: 'https://youtube.com' });
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });

    test('prefers changeInfo.url when both are available', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });

      triggerTabsUpdated(
        1,
        { url: 'https://youtube.com' },
        { url: 'https://not-blacklisted.com' },
      );
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(1);
    });

    test('does not block when storage is empty (defaults)', async () => {
      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });

    test('does not block when storage data is invalid (defaults)', async () => {
      setStorageData('brostrict_data', { blacklist: ['youtube.com'] });

      triggerTabsUpdated(1, { url: 'https://youtube.com' }, { url: 'https://youtube.com' });
      await flush();

      expect(getTabsUpdateCalls()).toHaveLength(0);
    });
  });
});
