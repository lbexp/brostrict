import { describe, test, expect } from 'bun:test';
import { isUrlWhitelisted } from '../../../src/url-utils.ts';

describe('isUrlWhitelisted', () => {
  describe('exact hostname matching', () => {
    test('returns true for exact hostname match', () => {
      expect(isUrlWhitelisted('https://youtube.com', ['youtube.com'])).toBe(true);
    });

    test('returns false for different hostname', () => {
      expect(isUrlWhitelisted('https://notyoutube.com', ['youtube.com'])).toBe(false);
    });

    test('returns false for subdomain', () => {
      expect(isUrlWhitelisted('https://m.youtube.com', ['youtube.com'])).toBe(false);
    });

    test('returns false for www subdomain', () => {
      expect(isUrlWhitelisted('https://www.youtube.com', ['youtube.com'])).toBe(false);
    });

    test('returns true when URL has port', () => {
      expect(isUrlWhitelisted('https://youtube.com:8080', ['youtube.com'])).toBe(true);
    });
  });

  describe('path matching', () => {
    test('returns true for exact path match', () => {
      expect(isUrlWhitelisted('https://youtube.com/video', ['youtube.com/video'])).toBe(true);
    });

    test('returns true for path with subpath', () => {
      expect(isUrlWhitelisted('https://youtube.com/video/123', ['youtube.com/video'])).toBe(
        true,
      );
    });

    test('returns false for similar but different path prefix', () => {
      expect(isUrlWhitelisted('https://youtube.com/videos', ['youtube.com/video'])).toBe(false);
    });

    test('returns false for parent path when child is whitelisted', () => {
      expect(isUrlWhitelisted('https://youtube.com', ['youtube.com/video'])).toBe(false);
    });

    test('returns true for deeply nested path', () => {
      expect(isUrlWhitelisted('https://youtube.com/a/b/c', ['youtube.com/a'])).toBe(true);
    });

    test('returns true for root path', () => {
      expect(isUrlWhitelisted('https://youtube.com/', ['youtube.com/'])).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    test('returns false for invalid URL', () => {
      expect(isUrlWhitelisted('not-a-url', ['youtube.com'])).toBe(false);
    });

    test('returns false for empty URL', () => {
      expect(isUrlWhitelisted('', ['youtube.com'])).toBe(false);
    });
  });

  describe('empty whitelist', () => {
    test('returns false when whitelist is empty', () => {
      expect(isUrlWhitelisted('https://youtube.com', [])).toBe(false);
    });
  });

  describe('multiple whitelist entries', () => {
    test('returns true if any entry matches', () => {
      expect(
        isUrlWhitelisted('https://twitter.com', ['youtube.com', 'twitter.com', 'facebook.com']),
      ).toBe(true);
    });

    test('returns false if no entry matches', () => {
      expect(
        isUrlWhitelisted('https://twitter.com', ['youtube.com', 'facebook.com']),
      ).toBe(false);
    });
  });

  describe('protocol handling', () => {
    test('handles http protocol', () => {
      expect(isUrlWhitelisted('http://youtube.com', ['youtube.com'])).toBe(true);
    });

    test('handles https protocol', () => {
      expect(isUrlWhitelisted('https://youtube.com', ['youtube.com'])).toBe(true);
    });
  });
});
