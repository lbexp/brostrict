import { beforeEach, afterEach, describe, test, expect } from 'bun:test';
import {
  createChromeMock,
  resetChromeState,
  setStorageData,
  type ChromeMock,
} from '../shared/chrome-mock';

declare const chrome: ChromeMock;

const bgModule = await import('../../../src/background');
const { cachedData, updateRules, init, isUrlWhitelisted, isUrlBlacklisted } = bgModule;

describe('background.ts', () => {
  beforeEach(() => {
    resetChromeState();
    (globalThis as typeof globalThis & { chrome: ChromeMock }).chrome = createChromeMock();
    cachedData.blacklist = [];
    cachedData.whitelist = [];
    cachedData.active = true;
  });

  afterEach(() => {
    resetChromeState();
  });

  describe('updateRules', () => {
    test('is a function', () => {
      expect(typeof updateRules).toBe('function');
    });

    test('does not throw when called with empty lists', () => {
      cachedData.blacklist = [];
      cachedData.whitelist = [];
      cachedData.active = true;
      expect(() => updateRules()).not.toThrow();
    });

    test('does not throw when active is false', () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = [];
      cachedData.active = false;
      expect(() => updateRules()).not.toThrow();
    });

    test('does not throw with whitelist entries', () => {
      cachedData.blacklist = [];
      cachedData.whitelist = ['youtube.com/video'];
      cachedData.active = true;
      expect(() => updateRules()).not.toThrow();
    });

    test('does not throw with blacklist entries', () => {
      cachedData.blacklist = ['facebook.com'];
      cachedData.whitelist = [];
      cachedData.active = true;
      expect(() => updateRules()).not.toThrow();
    });

    test('does not throw with mixed entries', () => {
      cachedData.blacklist = ['blocked.com'];
      cachedData.whitelist = ['allowed.com/path'];
      cachedData.active = true;
      expect(() => updateRules()).not.toThrow();
    });
  });

  describe('rule management', () => {
    test('removes all rules when protection is turned off', async () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      let rules = await chrome.declarativeNetRequest.getDynamicRules();
      expect(rules.length).toBeGreaterThan(0);

      cachedData.active = false;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      rules = await chrome.declarativeNetRequest.getDynamicRules();
      expect(rules.length).toBe(0);
    });

    test('blacklist rules have priority 1', async () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = [];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const blacklistRules = rules.filter((r) => r.priority === 1);
      expect(blacklistRules.length).toBe(1);
    });

    test('whitelist rules have priority 2', async () => {
      cachedData.blacklist = [];
      cachedData.whitelist = ['youtube.com/video'];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const whitelistRules = rules.filter((r) => r.priority === 2);
      expect(whitelistRules.length).toBe(1);
    });

    test('whitelist rules have higher priority than blacklist rules', async () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = ['youtube.com/yo'];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const whitelistRule = rules.find((r) => r.priority === 2);
      const blacklistRule = rules.find((r) => r.priority === 1);

      expect(whitelistRule).toBeDefined();
      expect(blacklistRule).toBeDefined();
      expect(whitelistRule!.priority).toBeGreaterThan(blacklistRule!.priority);
    });

    test('whitelist rule uses allow action', async () => {
      cachedData.blacklist = [];
      cachedData.whitelist = ['youtube.com/yo'];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      expect(rules[0]!.action.type).toBe('allow');
    });

    test('blacklist rule uses redirect action', async () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = [];
      cachedData.active = true;
      updateRules();
      await new Promise((r) => setTimeout(r, 0));

      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      expect(rules[0]!.action.type).toBe('redirect');
    });
  });

  describe('init', () => {
    test('is a function', () => {
      expect(typeof init).toBe('function');
    });

    test('does not throw when called', () => {
      expect(() => init()).not.toThrow();
    });

    test('loads data from storage and updates rules', async () => {
      setStorageData('brostrict_data', {
        blacklist: ['youtube.com'],
        whitelist: [],
        active: true,
      });
      init();
      await new Promise((r) => setTimeout(r, 0));
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('isUrlWhitelisted', () => {
    test('returns true for whitelisted URL', () => {
      cachedData.whitelist = ['allowed.com'];
      expect(isUrlWhitelisted('https://allowed.com', cachedData.whitelist)).toBe(true);
    });

    test('returns false for non-whitelisted URL', () => {
      cachedData.whitelist = ['allowed.com'];
      expect(isUrlWhitelisted('https://notallowed.com', cachedData.whitelist)).toBe(false);
    });

    test('returns false for empty whitelist', () => {
      cachedData.whitelist = [];
      expect(isUrlWhitelisted('https://anything.com', cachedData.whitelist)).toBe(false);
    });
  });

  describe('isUrlBlacklisted', () => {
    test('returns true for blacklisted URL', () => {
      cachedData.blacklist = ['blocked.com'];
      expect(isUrlBlacklisted('https://blocked.com', cachedData.blacklist)).toBe(true);
    });

    test('returns false for non-blacklisted URL', () => {
      cachedData.blacklist = ['blocked.com'];
      expect(isUrlBlacklisted('https://allowed.com', cachedData.blacklist)).toBe(false);
    });

    test('returns false for empty blacklist', () => {
      cachedData.blacklist = [];
      expect(isUrlBlacklisted('https://anything.com', cachedData.blacklist)).toBe(false);
    });
  });

  describe('whitelist over blacklist hierarchy', () => {
    test('whitelisted path is not blacklisted even when host is blacklisted', () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = ['youtube.com/yo'];

      expect(isUrlBlacklisted('https://youtube.com/watch', cachedData.blacklist)).toBe(true);
      expect(isUrlBlacklisted('https://youtube.com/yo', cachedData.blacklist)).toBe(true);
      expect(isUrlWhitelisted('https://youtube.com/yo', cachedData.whitelist)).toBe(true);

      expect(isUrlWhitelisted('https://youtube.com/yo', cachedData.whitelist)).toBe(true);
    });

    test('www variant works for both blacklist and whitelist', () => {
      cachedData.blacklist = ['youtube.com'];
      cachedData.whitelist = ['youtube.com/yo'];

      expect(isUrlBlacklisted('https://www.youtube.com/watch', cachedData.blacklist)).toBe(true);
      expect(isUrlWhitelisted('https://www.youtube.com/yo', cachedData.whitelist)).toBe(true);
    });
  });
});