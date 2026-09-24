import { Inter, Manrope } from 'next/font/google';

/**
 * Sayt shriftlari.
 *
 * Juftlik 2026-08-26 dagi qurilishdan tiklandi. Display uchun Satoshi
 * mo'ljallangan edi, lekin u bepul emas — shuning uchun Manrope.
 *
 * DIQQAT: `subsets` ga `cyrillic` ham kiritilgan. Sayt uch tilda
 * (CLAUDE.md §18) va ruscha matn lotin to'plamida chizilsa, brauzer
 * zaxira shriftga o'tib ketadi — sarlavhalar boshqa shriftda chiqardi.
 */
export const display = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-barff-display',
});

export const body = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-barff-sans',
});

/** Ikkala shrift o'zgaruvchisi — `<html>` ga qo'yiladi. */
export const fontVariables = `${display.variable} ${body.variable}`;
