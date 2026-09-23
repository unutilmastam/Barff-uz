import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SmoothScroll } from '@/motion/SmoothScroll';
import { LOCALES, isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { indexingAllowed } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

/** Uchala til ham build paytida oldindan tayyorlanadi. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Sahifalar uchun ZAXIRA metadata.
 *
 * Har bir sahifa o'z `generateMetadata` sida `buildMetadata()` ni
 * chaqiradi va bu yerdagi qiymatlarni almashtiradi. Bu yerda faqat
 * ikki narsa qoladi:
 *   - `metadataBase` — nisbiy manzillarni to'liq manzilga aylantirish;
 *   - `title.template` — har bir sarlavhaga brend qo'shimchasi.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: messages.meta.title,
      template: '%s — BARFF',
    },
    description: messages.meta.description,

    // Kontent tayyor bo'lmaguncha sayt qidiruvga tushmaydi
    // (CLAUDE.md §19). Sahifalar buni o'zgartira oladi.
    robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Noma'lum til kodi (`/de`) — 404. Aks holda sayt bo'sh tarjimalar bilan
  // ochilib, foydalanuvchiga buzilgan sahifa ko'rsatilardi.
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          {messages.common.skipToContent}
        </a>

        {/*
          Yumshoq skroll faqat sichqonchali, kuchli va `reduce` so'ramagan
          qurilmada ishga tushadi — qolgan hamma brauzerning O'Z skrollini
          oladi (`SmoothScroll` izohiga qarang).
        */}
        <SmoothScroll />

        <QueryProvider>
          <Header locale={locale} messages={messages} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer locale={locale} messages={messages} />
        </QueryProvider>
      </body>
    </html>
  );
}
