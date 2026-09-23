import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/common/LegalPage';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return buildMetadata({
    locale,
    path: '/privacy',
    title: messages.legal.privacyTitle,
    description: messages.legal.pending,
    // Matni tayyor bo'lmagan huquqiy hujjat indekslanmaydi.
    noIndex: true,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return <LegalPage title={messages.legal.privacyTitle} messages={messages} />;
}
