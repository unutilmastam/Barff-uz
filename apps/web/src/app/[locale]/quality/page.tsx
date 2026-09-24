import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GlassCard, Section, SectionHeader } from '@barff/ui';
import { FileLink } from '@/components/common/FileLink';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getCertificates, getDocuments } from '@/lib/content';
import { formatDate, text } from '@/lib/localized';
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
    path: '/quality',
    title: messages.quality.title,
    description: messages.quality.intro,
  });
}

/**
 * Sifat va sertifikatlar.
 *
 * CLAUDE.md §19: soxta sertifikat YARATILMAYDI — sahifa faqat
 * bazadagi haqiqiy yozuvlarni ko'rsatadi.
 */
export default async function QualityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const [certificates, documents] = await Promise.all([
    getCertificates(locale),
    getDocuments(locale),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={messages.quality.subtitle}
        title={messages.quality.title}
        intro={messages.quality.intro}
      />

      <Section>
        <Container>
          <SectionHeader title={messages.quality.certificatesTitle} />

          <div className="mt-10">
            {certificates === null ? (
              <ErrorState
                title={messages.common.unavailableTitle}
                body={messages.common.unavailableBody}
              />
            ) : certificates.length === 0 ? (
              <EmptyState message={messages.quality.certificatesEmpty} />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((certificate) => (
                  <GlassCard as="li" key={certificate.id} className="flex flex-col gap-3 p-6">
                    <h3 className="display-4">{text(certificate.title, locale)}</h3>

                    {certificate.description !== null && (
                      <p className="text-sm text-[var(--color-fg-muted)]">
                        {text(certificate.description, locale)}
                      </p>
                    )}

                    <dl className="mt-auto flex flex-col gap-1 text-sm">
                      {certificate.issuer !== null && (
                        <div className="flex gap-2">
                          <dt className="text-[var(--color-fg-subtle)]">
                            {messages.quality.issuer}:
                          </dt>
                          <dd>{certificate.issuer}</dd>
                        </div>
                      )}
                      {certificate.number !== null && (
                        <div className="flex gap-2">
                          <dt className="text-[var(--color-fg-subtle)]">
                            {messages.quality.number}:
                          </dt>
                          <dd className="tabular-nums">{certificate.number}</dd>
                        </div>
                      )}
                      {certificate.expiresAt !== null && (
                        <div className="flex gap-2">
                          <dt className="text-[var(--color-fg-subtle)]">
                            {messages.quality.expiresAt}:
                          </dt>
                          <dd>
                            <time dateTime={certificate.expiresAt}>
                              {formatDate(certificate.expiresAt, locale)}
                            </time>
                          </dd>
                        </div>
                      )}
                    </dl>

                    {certificate.file !== null && (
                      <FileLink
                        file={certificate.file}
                        label={text(certificate.title, locale)}
                        actionLabel={messages.quality.download}
                      />
                    )}
                  </GlassCard>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <SectionHeader title={messages.quality.documentsTitle} />

          <div className="mt-10">
            {documents === null ? (
              <ErrorState
                title={messages.common.unavailableTitle}
                body={messages.common.unavailableBody}
              />
            ) : documents.length === 0 ? (
              <EmptyState message={messages.quality.documentsEmpty} />
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
          </div>
        </Container>
      </Section>
    </>
  );
}
