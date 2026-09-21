import { describe, expect, it } from 'vitest';
import { formatPhone, isValidUzPhone, normalizePhone, truncate } from './format';

describe('telefon', () => {
  it('turli yozuvlarni bir ko’rinishga keltiradi', () => {
    const expected = '998901234567';
    expect(normalizePhone('+998 90 123 45 67')).toBe(expected);
    expect(normalizePhone('998901234567')).toBe(expected);
    expect(normalizePhone('901234567')).toBe(expected);
    expect(normalizePhone('(90) 123-45-67')).toBe(expected);
  });

  it('eski 8-prefiksli yozuvni tuzatadi', () => {
    expect(normalizePhone('8901234567')).toBe('998901234567');
  });

  it('haqiqiylikni tekshiradi', () => {
    expect(isValidUzPhone('+998 90 123 45 67')).toBe(true);
    expect(isValidUzPhone('12345')).toBe(false);
    expect(isValidUzPhone('+7 495 123 45 67')).toBe(false);
  });

  it('ko’rsatish uchun formatlaydi', () => {
    expect(formatPhone('998901234567')).toBe('+998 90 123 45 67');
  });

  it('noto’g’ri raqamni o’zgartirmaydi', () => {
    expect(formatPhone('12345')).toBe('12345');
  });
});

describe('truncate', () => {
  it('qisqa matnga tegmaydi', () => {
    expect(truncate('salom', 10)).toBe('salom');
  });

  it('so’z o’rtasidan kesmaydi', () => {
    expect(truncate('birinchi ikkinchi uchinchi', 18)).toBe('birinchi ikkinchi…');
  });
});
