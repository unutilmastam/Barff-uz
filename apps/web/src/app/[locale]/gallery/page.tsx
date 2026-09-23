import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { getGallery } from '@/lib/content';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return {
    title: messages.gallery.title,
    description: messages.gallery.subtitle,
    alternates: { canonical: `/${locale}/gallery` },
  };
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const items = await getGallery(locale);

  return (
    <>
      <PageHeader eyebrow={messages.gallery.subtitle} title={messages.gallery.title} />

      <Section>
        <Container>
          {items === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : items.length === 0 ? (
            <EmptyState message={messages.gallery.empty} />
          ) : (
            <GalleryGrid items={items} locale={locale} messages={messages} />
          )}
        </Container>
      </Section>
    </>
  );
}
