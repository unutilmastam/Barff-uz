import { type Metadata, type Viewport } from 'next';
import { type ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BARFF yetkazish', template: '%s — BARFF yetkazish' },
  // Haydovchi ilovasi qidiruvga UMUMAN tushmaydi.
  robots: { index: false, follow: false, nocache: true },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'BARFF yetkazish', statusBarStyle: 'black-translucent' },
};

/**
 * TELEFON UCHUN.
 *
 * `maximumScale` CHEKLANMAGAN: kattalashtirishni taqiqlash
 * ko'zi yaxshi ko'rmaydigan haydovchini ilovadan mahrum qilardi
 * (WCAG 1.4.4).
 *
 * `viewportFit: 'cover'` — zamonaviy telefonlarda ekran chetigacha;
 * xavfsiz maydon CSS da `env(safe-area-inset-*)` bilan hisobga
 * olinadi.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c7830',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" data-theme="light">
      {/*
        KO'RINISH QAT'IY YORUG'.

        Haydovchi ilovani KUNDUZI, ochiq havoda ishlatadi va
        telefonning "qorong'i rejim" sozlamasi o'sha yerda
        o'qishni QIYINLASHTIRADI. Shuning uchun bu yerda ko'rinish
        almashtirgichi YO'Q va `data-theme` qat'iy.

        Bu boshqa ilovalardan ataylab farq qiladi: u yerda tanlov
        foydalanuvchiniki, bu yerda esa ishlash sharti.
      */}
      <body className="min-h-dvh bg-white text-[#111]">{children}</body>
    </html>
  );
}
