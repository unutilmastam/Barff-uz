import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, text } from './localized';

describe('text', () => {
  const value = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

  it('joriy tildagi matnni qaytaradi', () => {
    expect(text(value, 'ru')).toBe('Русский');
  });

  it('tarjima yoq bolsa boshqa tildagi matnga tushadi', () => {
    // Bo'sh kartochka ko'rsatishdan ko'ra boshqa tildagi nom yaxshiroq.
    expect(text({ uz: 'Anor', ru: '', en: '' }, 'en')).toBe('Anor');
  });

  it('faqat bosh joy bolgan tarjimani hisobga olmaydi', () => {
    expect(text({ uz: 'Anor', ru: '   ', en: '' }, 'ru')).toBe('Anor');
  });

  it('hech qayerda matn bolmasa zaxira qiymat qaytadi', () => {
    expect(text({ uz: '', ru: '', en: '' }, 'uz', 'MOCK-SKU')).toBe('MOCK-SKU');
    expect(text(null, 'uz', 'MOCK-SKU')).toBe('MOCK-SKU');
    expect(text(undefined, 'uz')).toBe('');
  });
});

describe('formatMoney', () => {
  it('tiyinni butun songa aylantiradi', () => {
    // 1 800 000 tiyin = 18 000 so'm. Suzuvchi nuqta ISHLATILMAYDI.
    const result = formatMoney(1_800_000, 'UZS', 'uz');
    expect(result).toContain('18');
    expect(result).not.toContain('1800000');
  });

  it('nolni ham korsatadi', () => {
    expect(formatMoney(0, 'UZS', 'uz')).toContain('0');
  });
});

describe('formatDate', () => {
  it('null uchun bosh satr', () => {
    expect(formatDate(null, 'uz')).toBe('');
  });

  it('ISO sanani formatlaydi', () => {
    expect(formatDate('2026-03-15T10:00:00.000Z', 'en')).toContain('2026');
  });
});
