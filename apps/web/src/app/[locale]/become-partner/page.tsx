import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { LeadForm } from '@/components/forms/LeadForm';
import { Container } from '@/components/layout/Container';
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
    path: '/become-partner',
    title: messages.lead.title,
    description: messages.lead.intro,
  });
}

/**
 * B2B ariza sahifasi (CLAUDE.md §9).
 *
 * Sahifaning o'zi statik — faqat forma mijoz komponenti. Shu sababli
 * matn darhol ko'rinadi va JavaScript kechikkanda ham sahifa bo'sh
 * qolmaydi.
 */
export default async function BecomePartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <>
      <PageHeader
        eyebrow={messages.lead.subtitle}
        title={messages.lead.title}
        intro={messages.lead.intro}
      />

      <Section>
        <Container className="max-w-3xl">
          <LeadForm messages={messages} />
        </Container>
      </Section>
    </>
  );
}
