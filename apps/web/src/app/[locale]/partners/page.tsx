import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, GlassCard, Section, SectionHeader } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { routeReady } from '@/lib/routes';
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
    path: '/partners',
    title: messages.partners.title,
    description: messages.partners.intro,
  });
}

/**
 * Hamkorlar sahifasi.
 *
 * Bu yerda BARFF haqidagi FAKT yo'q — faqat hamkorlik qanday
 * boshlanishi tasvirlangan, ya'ni bizning jarayonimiz. Shartlar,
 * chegirmalar va hududlar BARFF dan kelishi kerak (Q13).
 */
export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  const steps = [
    { title: messages.partners.step1, body: messages.partners.step1Body },
    { title: messages.partners.step2, body: messages.partners.step2Body },
    { title: messages.partners.step3, body: messages.partners.step3Body },
  ];

  return (
    <>
      <PageHeader
        eyebrow={messages.partners.subtitle}
        title={messages.partners.title}
        intro={messages.partners.intro}
      />

      <Section>
        <Container>
          <SectionHeader title={messages.partners.howTitle} />

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <GlassCard as="li" key={step.title} className="flex flex-col gap-3 p-6">
                <span className="text-sm font-medium tabular-nums text-[var(--color-brand-400)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-medium">{step.title}</h3>
                <p className="text-sm text-[var(--color-fg-muted)]">{step.body}</p>
              </GlassCard>
            ))}
          </ol>

          {/* Ariza sahifasi S14 da quriladi (`routes.ts`). */}
          {routeReady('becomePartner') && (
            <div className="mt-10">
              <Button asChild size="lg">
                <Link href={`/${locale}/become-partner`}>{messages.home.ctaAction}</Link>
              </Button>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
