import type { Metadata, Viewport } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageTransition } from '@/components/layout/PageTransition';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { Cursor } from '@/components/ui/Cursor';
import { Loader } from '@/components/ui/Loader';
import { SkipLink } from '@/components/ui/SkipLink';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';
import { DEFAULT_LOCALE, LOCALE_HTML_LANG } from '@/lib/i18n';
import { ALLOW_INDEXING, OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/seo';
import { body, display } from './fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Nisbiy URL'lar (OG rasm, canonical) shu manzilga nisbatan hisoblanadi.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // Ichki sahifalar faqat o'z nomini beradi: "Mahsulotlar — BARFF".
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'BARFF — [CLIENT CONTENT REQUIRED]: brend tavsifi mijozdan kutilmoqda.',
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: DEFAULT_LOCALE,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height }],
  },
  twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
  // Kontent placeholder ekan — qidiruvga chiqmaydi (`lib/seo.ts` ga qarang).
  robots: ALLOW_INDEXING
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
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
        <OrganizationJsonLd />
        <LocaleProvider>
          <SmoothScrollProvider>
            <Loader />
            <SkipLink />
            <Cursor />
            <Header />
            <PageTransition>
              {/* Tepa bo'shliq global emas: Hero to'liq ekran, Header uning ustidan tushadi.
                  Ichki sahifalar o'z tepa bo'shlig'ini o'zi qo'yadi. */}
              {/* Blok (flex EMAS): ScrollTrigger `pin` flex farzandda pin-spacer'ga
                  padding qo'sha olmaydi va pin hech qachon tugamaydi. */}
              <div id="main-content" className="flex-1">
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
