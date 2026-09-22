import { type ReactNode } from 'react';
import './globals.css';

/**
 * Ildiz layout — ataylab "o'tkazuvchi".
 *
 * `<html lang>` til bilan birga o'zgarishi kerak, til esa `[locale]`
 * segmentidan keladi. Shuning uchun `<html>` va `<body>` `[locale]`
 * layout'ida chiziladi, bu yerda esa faqat kontent uzatiladi.
 *
 * Til segmentisiz yo'llar (masalan `/yoq-bunday`) uchun `app/not-found.tsx`
 * o'z `<html>` ini o'zi chizadi.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
