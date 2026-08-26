import type { Metadata, Viewport } from 'next';
import { body, display } from './fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // To'liq SEO metadata Phase 10 da yoziladi.
  title: 'BARFF',
  description: '[CLIENT CONTENT REQUIRED] — brend tavsifi',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
