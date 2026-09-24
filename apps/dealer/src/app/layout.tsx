import { type Metadata } from 'next';
import { THEME_INIT_SCRIPT } from '@barff/ui';
import { type ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BARFF hamkor portali', template: '%s — BARFF hamkor portali' },
  // Portal qidiruvga UMUMAN tushmaydi: bu yerda diler narxlari bor.
  // `next.config.ts` dagi `X-Robots-Tag` bilan birga ikki qatlam.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      {/*
        Ko'rinish sahifa CHIZILISHIDAN OLDIN qo'llanadi — aks holda
        yorug' rejimdagi foydalanuvchi har safar bir lahza qorong'i
        ekranni ko'rardi. Matn o'zgarmas satr.
      */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <body className="min-h-dvh bg-[var(--color-ink-900)] text-[var(--color-fg)]">{children}</body>
    </html>
  );
}
