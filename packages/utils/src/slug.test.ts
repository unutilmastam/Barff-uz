import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('oddiy matnni o’giradi', () => {
    expect(slugify('BARFF Apple Juice')).toBe('barff-apple-juice');
  });

  it('o’zbek apostroflarini ajratuvchi sifatida ishlatmaydi', () => {
    expect(slugify('O‘zbek ichimligi')).toBe('ozbek-ichimligi');
    expect(slugify('G‘alaba')).toBe('galaba');
  });

  it('kirill va rus harflarini transliteratsiya qiladi', () => {
    expect(slugify('Яблочный сок')).toBe('yablochnyy-sok');
    expect(slugify('Шафтоли')).toBe('shaftoli');
    expect(slugify('Щербет')).toBe('shcherbet');
  });

  it('ortiqcha belgilar va chiziqchalarni tozalaydi', () => {
    expect(slugify('  Olma / Anor  ')).toBe('olma-anor');
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('!!!')).toBe('');
  });

  it('diakritiklarni olib tashlaydi', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });
});

describe('uniqueSlug', () => {
  it('band bo’lmasa asl slugni qaytaradi', () => {
    expect(uniqueSlug('Olma', [])).toBe('olma');
  });

  it('band bo’lsa raqam qo’shadi', () => {
    expect(uniqueSlug('Olma', ['olma'])).toBe('olma-2');
    expect(uniqueSlug('Olma', ['olma', 'olma-2', 'olma-3'])).toBe('olma-4');
  });
});
