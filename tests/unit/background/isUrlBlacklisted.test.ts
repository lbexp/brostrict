import { describe, test, expect } from 'bun:test';
import { isUrlBlacklisted } from '../../../src/url-utils.ts';

describe('isUrlBlacklisted', () => {
  describe('exact hostname matching', () => {
    test('returns true for exact hostname match', () => {
      expect(isUrlBlacklisted('https://youtube.com', ['youtube.com'])).toBe(true);
    });

    test('returns false for different hostname', () => {
      expect(isUrlBlacklisted('https://notyoutube.com', ['youtube.com'])).toBe(false);
    });

    test('returns false for subdomain', () => {
      expect(isUrlBlacklisted('https://m.youtube.com', ['youtube.com'])).toBe(false);
    });

    test('returns true when URL has port', () => {
      expect(isUrlBlacklisted('https://youtube.com:8080', ['youtube.com'])).toBe(true);
    });
  });

  describe('path matching', () => {
    test('returns true for exact path match', () => {
      expect(isUrlBlacklisted('https://youtube.com/video', ['youtube.com/video'])).toBe(true);
    });

    test('returns true for path with subpath', () => {
      expect(isUrlBlacklisted('https://youtube.com/video/123', ['youtube.com/video'])).toBe(true);
    });

    test('returns false for similar but different path prefix', () => {
      expect(isUrlBlacklisted('https://youtube.com/videos', ['youtube.com/video'])).toBe(false);
    });

    test('returns false for parent path when child is blacklisted', () => {
      expect(isUrlBlacklisted('https://youtube.com', ['youtube.com/video'])).toBe(false);
    });

    test('returns true for deeply nested path', () => {
      expect(isUrlBlacklisted('https://youtube.com/a/b/c', ['youtube.com/a'])).toBe(true);
    });

    test('returns true for root path', () => {
      expect(isUrlBlacklisted('https://youtube.com/', ['youtube.com/'])).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    test('returns false for invalid URL', () => {
      expect(isUrlBlacklisted('not-a-url', ['youtube.com'])).toBe(false);
    });

    test('returns false for empty URL', () => {
      expect(isUrlBlacklisted('', ['youtube.com'])).toBe(false);
    });
  });

  describe('empty blacklist', () => {
    test('returns false when blacklist is empty', () => {
      expect(isUrlBlacklisted('https://youtube.com', [])).toBe(false);
    });
  });

  describe('multiple blacklist entries', () => {
    test('returns true if any entry matches', () => {
      expect(
        isUrlBlacklisted('https://twitter.com', ['youtube.com', 'twitter.com', 'facebook.com']),
      ).toBe(true);
    });

    test('returns false if no entry matches', () => {
      expect(
        isUrlBlacklisted('https://twitter.com', ['youtube.com', 'facebook.com']),
      ).toBe(false);
    });
  });

  describe('protocol handling', () => {
    test('handles http protocol', () => {
      expect(isUrlBlacklisted('http://youtube.com', ['youtube.com'])).toBe(true);
    });

    test('handles https protocol', () => {
      expect(isUrlBlacklisted('https://youtube.com', ['youtube.com'])).toBe(true);
    });
  });
});
