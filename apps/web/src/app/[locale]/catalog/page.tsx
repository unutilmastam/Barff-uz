import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@barff/ui';
import { FileLink } from '@/components/common/FileLink';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getDocuments } from '@/lib/content';
import { text } from '@/lib/localized';
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
    path: '/catalog',
    title: messages.catalog.title,
    description: messages.catalog.intro,
  });
}

/**
 * Katalog — yuklab olinadigan ommaviy hujjatlar.
 *
 * Hujjatlar `PUBLIC` ko'rinishdagi media bilan bog'langan, shuning
 * uchun havola to'g'ridan-to'g'ri CDN'ga boradi. Maxfiy hujjatlar
 * (diler narxlari va h.k.) bu ro'yxatga TUSHMAYDI — ular boshqa
 * endpoint orqali, imzolangan manzil bilan beriladi.
 */
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const documents = await getDocuments(locale);

  return (
    <>
      <PageHeader
        eyebrow={messages.catalog.subtitle}
        title={messages.catalog.title}
        intro={messages.catalog.intro}
      />

      <Section>
        <Container>
          {documents === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : documents.length === 0 ? (
            <EmptyState message={messages.catalog.empty} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {documents.map((document) => (
                <li key={document.id}>
                  <FileLink
                    file={document.file}
                    label={text(document.title, locale)}
                    actionLabel={messages.quality.download}
                  />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
