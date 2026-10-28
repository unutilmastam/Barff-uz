/**
 * CSV yordamchilari (CLAUDE.md §22).
 *
 * BIR JOYDA — hisobotlar ham, hisob-faktura eksporti ham (S36)
 * shu yerdan foydalanadi, ikkita nusxa ajralib ketmasligi uchun.
 */

/**
 * CSV FORMULA IN'EKSIYASIGA QARSHI.
 *
 * `=`, `+`, `-`, `@`, tabulyatsiya yoki qator boshi bilan
 * boshlangan MATN Excel'da formula sifatida ochiladi. Dilerning
 * kompaniya nomini o'zi kiritadi (ochiq ariza formasi), ya'ni
 * `=HYPERLINK("http://...","Bosing")` degan nom buxgalterning
 * jadvaliga to'g'ridan-to'g'ri tushardi.
 *
 * Tuzatish — boshiga `'` qo'yish: Excel uni ko'rsatmaydi, lekin
 * katakni MATN deb oladi.
 *
 * FAQAT MATNGA. Raqam (`-500` kabi manfiy tiyin) `number` bo'lib
 * keladi va tegilmaydi — aks holda balansdagi manfiy summa
 * buzilardi.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';

  if (typeof value === 'number') {
    return `"${String(value)}"`;
  }

  const safe = FORMULA_START.test(value) ? `'${value}` : value;

  /*
    QO'SH TIRNOQ HAR DOIM QO'YILADI va ichidagisi ikkilantiriladi.
    Shartli qo'yish ("faqat vergul bo'lsa") kompaniya nomida tirnoq
    yoki yangi qator bo'lgan holatni buzardi.
  */
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly (string | number | null | undefined)[]): string {
  return `${values.map(csvCell).join(',')}\r\n`;
}

/**
 * BOM — usiz Excel UTF-8 ni o'zbekcha harflar bilan noto'g'ri
 * o'qiydi (`so‘m` -> `soâ€˜m`).
 */
export const CSV_BOM = '﻿';
