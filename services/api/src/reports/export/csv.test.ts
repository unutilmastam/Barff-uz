import { describe, expect, it } from 'vitest';
import { CSV_BOM, csvCell, csvRow } from './csv';

describe('CSV', () => {
  /**
   * FORMULA IN'EKSIYASI: dilerning kompaniya nomini o'zi kiritadi
   * (ochiq ariza formasi), `=HYPERLINK(...)` bilan boshlangan nom
   * buxgalterning Excel'ida formula bo'lib ochilardi.
   */
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1'])(
    '%j MATN formulaga aylanmaydi',
    (text) => {
      expect(csvCell(text).startsWith(`"'`)).toBe(true);
    },
  );

  /** RAQAM tegilmaydi: manfiy tiyin (`-500`) `'` olsa, balans matnga aylanardi. */
  it('manfiy RAQAM buzilmaydi, manfiy MATN himoyalanadi', () => {
    expect(csvCell(-500)).toBe('"-500"');
    expect(csvCell('-500')).toBe(`"'-500"`);
  });

  it('qosh tirnoq ikkilantiriladi', () => {
    expect(csvCell('A "B" C')).toBe('"A ""B"" C"');
  });

  it('vergul va yangi qator qatorni BUZMAYDI', () => {
    expect(csvRow(['a,b', 'x\ny'])).toBe('"a,b","x\ny"\r\n');
  });

  it('null va undefined bosh katak', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('oddiy matn boshida apostrof olmaydi', () => {
    expect(csvCell('Toshkent')).toBe('"Toshkent"');
  });

  it('BOM Excel uchun', () => {
    expect(CSV_BOM).toBe('﻿');
  });
});
