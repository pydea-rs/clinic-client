import { describe, it, expect } from 'vitest';
import { getMessageDirection, MAX_DIRECTION_SCAN_CHARS } from '../text-direction';

describe('getMessageDirection', () => {
  it('returns rtl when the first letter is Persian and ltr when Latin', () => {
    expect(getMessageDirection('سلام، سردرد شدید دارم')).toBe('rtl');
    expect(getMessageDirection('Hello, I have a headache')).toBe('ltr');
  });

  it('skips leading ASCII, Persian, and Arabic digits plus punctuation and markdown symbols', () => {
    expect(getMessageDirection('123سلام')).toBe('rtl');
    expect(getMessageDirection('۳۰ ساله هستم')).toBe('rtl');
    expect(getMessageDirection('١٢٣ تب و لرز')).toBe('rtl');
    expect(getMessageDirection('**سلام**')).toBe('rtl');
    expect(getMessageDirection('1. تب و سردرد')).toBe('rtl');
    expect(getMessageDirection('123Hello')).toBe('ltr');
  });

  it('enforces the 10-character leading scan limit cleanly', () => {
    expect(MAX_DIRECTION_SCAN_CHARS).toBe(10);
    // 9 digits followed by a Persian letter at the 10th character -> rtl
    expect(getMessageDirection('123456789س')).toBe('rtl');
    // 10 digits where the 10th character is still a digit -> ltr
    expect(getMessageDirection('0123456789س')).toBe('ltr');
    expect(getMessageDirection('۰۱۲۳۴۵۶۷۸۹س')).toBe('ltr');
  });

  it('uses the first non-digit letter even if Persian appears later, and defaults to ltr for empty/digits-only', () => {
    expect(getMessageDirection('123abcسلام')).toBe('ltr');
    expect(getMessageDirection('')).toBe('ltr');
    expect(getMessageDirection('1234567890')).toBe('ltr');
  });
});
