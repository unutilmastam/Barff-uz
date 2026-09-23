import { type Metadata } from 'next';
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
      <body className="min-h-dvh bg-[var(--color-ink-900)] text-[var(--color-fg)]">{children}</body>
    </html>
  );
}
