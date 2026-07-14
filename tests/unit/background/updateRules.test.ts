import { beforeEach, afterEach, describe, test, expect } from 'bun:test';
import {
  createChromeMock,
  resetChromeState,
  setStorageData,
  type ChromeMock,
} from '../shared/chrome-mock';

declare const chrome: ChromeMock;

const bgModule = await import('../../../src/background');
const { cachedData, updateRules, init, isUrlWhitelisted } = bgModule;

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

  describe('init', () => {
    test('is a function', () => {
      expect(typeof init).toBe('function');
    });

    test('does not throw when called', () => {
      expect(() => init()).not.toThrow();
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
});
