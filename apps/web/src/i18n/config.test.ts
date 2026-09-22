import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, isLocale } from './config';

describe('til sozlamalari', () => {
  it("standart til — o'zbekcha", () => {
    expect(DEFAULT_LOCALE).toBe('uz');
  });

  it("qo'llab-quvvatlanadigan tillarni taniydi", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
  });

  it('begona kodlarni rad etadi', () => {
    for (const value of ['de', 'tr', 'UZ', '', 'uzb', '../etc']) {
      expect(isLocale(value)).toBe(false);
    }
  });

  it('har bir til uchun nom bor', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale].length).toBeGreaterThan(0);
    }
  });
});
