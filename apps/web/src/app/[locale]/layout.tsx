import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { LOCALES, isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';

/** Uchala til ham build paytida oldindan tayyorlanadi. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return {
    title: messages.meta.title,
    description: messages.meta.description,

    // Placeholder kontent qidiruvga tushmasligi kerak (CLAUDE.md §19):
    // haqiqiy kontent paydo bo'lgunicha indekslash o'chiq turadi.
    robots:
      process.env['NEXT_PUBLIC_ALLOW_INDEXING'] === 'true'
        ? { index: true, follow: true }
        : { index: false, follow: false },
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

        <QueryProvider>
          <Header locale={locale} messages={messages} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer messages={messages} />
        </QueryProvider>
      </body>
    </html>
  );
}
