import { describe, test, expect } from 'bun:test';
import { toUrlFilter } from '../../../src/url-utils.ts';

describe('toUrlFilter', () => {
  test('prepends || to pattern and escapes special chars', () => {
    expect(toUrlFilter('youtube.com')).toBe('||youtube\\.com');
  });

  test('escapes dot character', () => {
    expect(toUrlFilter('youtube.com')).toBe('||youtube\\.com');
  });

  test('escapes question mark', () => {
    expect(toUrlFilter('youtube.com?')).toBe('||youtube\\.com\\?');
  });

  test('escapes asterisk', () => {
    expect(toUrlFilter('*.youtube.com')).toBe('||\\*\\.youtube\\.com');
  });

  test('escapes plus sign', () => {
    expect(toUrlFilter('youtube+test.com')).toBe('||youtube\\+test\\.com');
  });

  test('escapes caret', () => {
    expect(toUrlFilter('^youtube')).toBe('||\\^youtube');
  });

  test('escapes dollar sign', () => {
    expect(toUrlFilter('youtube$')).toBe('||youtube\\$');
  });

  test('escapes parentheses', () => {
    expect(toUrlFilter('youtube(test).com')).toBe('||youtube\\(test\\)\\.com');
  });

  test('escapes square brackets', () => {
    expect(toUrlFilter('youtube[test]')).toBe('||youtube\\[test\\]');
  });

  test('escapes pipe character', () => {
    expect(toUrlFilter('youtube|facebook')).toBe('||youtube\\|facebook');
  });

  test('escapes backslash', () => {
    expect(toUrlFilter('youtube\\test')).toBe('||youtube\\\\test');
  });

  test('escapes multiple special characters', () => {
    expect(toUrlFilter('youtube.com/test?foo=1')).toBe('||youtube\\.com/test\\?foo=1^');
  });

  test('handles path with slash', () => {
    expect(toUrlFilter('youtube.com/video')).toBe('||youtube\\.com/video^');
  });

  test('handles simple alphanumeric', () => {
    expect(toUrlFilter('youtube')).toBe('||youtube');
  });
});
