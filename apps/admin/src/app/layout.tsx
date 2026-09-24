import { type Metadata } from 'next';
import { THEME_INIT_SCRIPT } from '@barff/ui';
import { type ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BARFF admin', template: '%s — BARFF admin' },
  // Admin panel qidiruvga UMUMAN tushmaydi. `next.config.ts` dagi
  // `X-Robots-Tag` sarlavhasi bilan birga ikki qatlam himoya.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      {/*
        Ko'rinish sahifa CHIZILISHIDAN OLDIN qo'llanadi.

        Sayt statik qurilgani uchun server foydalanuvchining tanlovini
        BILMAYDI — u brauzer xotirasida. Agar tanlov React yuklangach
        qo'llansa, yorug' rejimdagi foydalanuvchi har safar bir lahza
        qorong'i ekranni ko'rardi. Sinxron skript shu sakrashni yo'q
        qiladi.

        Matn o'zgarmas satr, foydalanuvchi ma'lumoti aralashmaydi.
      */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <body className="min-h-dvh bg-[var(--color-ink-900)] text-[var(--color-fg)]">{children}</body>
    </html>
  );
}
