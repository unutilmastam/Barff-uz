import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GlassCard, MediaFrame, Section } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { PageHeader } from '@/components/common/PageHeader';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getProductionSteps } from '@/lib/content';
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
    path: '/production',
    title: messages.production.title,
    description: messages.production.intro,
  });
}

/** Ishlab chiqarish jarayoni (CLAUDE.md §4). Bosqichlar CMS'dan keladi. */
export default async function ProductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const steps = await getProductionSteps(locale);

  return (
    <>
      <PageHeader
        eyebrow={messages.production.subtitle}
        title={messages.production.title}
        intro={messages.production.intro}
      />

      <Section>
        <Container>
          {steps === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : steps.length === 0 ? (
            <EmptyState message={messages.production.empty} />
          ) : (
            <ol className="flex flex-col gap-6">
              {steps.map((step, index) => (
                <GlassCard
                  as="li"
                  key={step.id}
                  className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8 lg:grid-cols-[auto_1fr_320px]"
                >
                  <span className="text-2xl font-semibold tabular-nums text-[var(--color-accent-text)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div>
                    <h2 className="display-3">{text(step.title, locale, step.slug)}</h2>
                    {step.description !== null && (
                      <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">
                        {text(step.description, locale)}
                      </p>
                    )}
                  </div>

                  {step.image !== null && (
                    <MediaFrame ratio="landscape" className="lg:col-start-3">
                      <ApiImage
                        image={step.image}
                        alt={text(step.title, locale, step.slug)}
                        sizes="(max-width: 1024px) 90vw, 320px"
                        className="h-full w-full object-cover"
                      />
                    </MediaFrame>
                  )}
                </GlassCard>
              ))}
            </ol>
          )}
        </Container>
      </Section>
    </>
  );
}
