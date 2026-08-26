import type { Metadata, Viewport } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageTransition } from '@/components/layout/PageTransition';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { Cursor } from '@/components/ui/Cursor';
import { Loader } from '@/components/ui/Loader';
import { SkipLink } from '@/components/ui/SkipLink';
import { DEFAULT_LOCALE, LOCALE_HTML_LANG } from '@/lib/i18n';
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
    // `lang` mijozda tanlangan tilga qarab `LocaleProvider` tomonidan yangilanadi.
    <html lang={LOCALE_HTML_LANG[DEFAULT_LOCALE]} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <LocaleProvider>
          <SmoothScrollProvider>
            <Loader />
            <SkipLink />
            <Cursor />
            <Header />
            <PageTransition>
              {/* Tepa bo'shliq global emas: Hero to'liq ekran, Header uning ustidan tushadi.
                  Ichki sahifalar o'z tepa bo'shlig'ini o'zi qo'yadi. */}
              <div id="main-content" className="flex flex-1 flex-col">
                {children}
              </div>
            </PageTransition>
            <Footer />
          </SmoothScrollProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
