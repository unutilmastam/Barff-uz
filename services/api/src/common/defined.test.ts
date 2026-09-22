import { describe, expect, it } from 'vitest';
import { defined } from './defined';

describe('defined', () => {
  it('undefined qiymatli kalitlarni olib tashlaydi', () => {
    expect(defined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });

  it('kalitning OZINI olib tashlaydi, qiymatini emas', () => {
    // Prisma uchun `{ sku: undefined }` va `{}` bir xil emas.
    expect(Object.keys(defined({ sku: undefined }))).toEqual([]);
  });

  it('null qiymatni SAQLAB qoladi', () => {
    // `null` — ma'noli qiymat: "bu maydonni bo'shatish".
    expect(defined({ a: null })).toEqual({ a: null });
  });

  it('false, 0 va bosh satrni saqlaydi', () => {
    expect(defined({ a: false, b: 0, c: '' })).toEqual({ a: false, b: 0, c: '' });
  });

  it('bosh obyekt bilan ishlaydi', () => {
    expect(defined({})).toEqual({});
  });

  it('asl obyektni ozgartirmaydi', () => {
    const source = { a: 1, b: undefined };
    defined(source);
    expect('b' in source).toBe(true);
  });
});
