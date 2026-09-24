import { type Locale, type PublicCertificate } from '@barff/types';
import { GlassCard, Section, SectionHeader } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { formatDate, text } from '@/lib/localized';
import { Reveal } from '@/motion/Reveal';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Sifat va sertifikatlar.
 *
 * CLAUDE.md §19: soxta sertifikat YARATILMAYDI. Shuning uchun bu
 * bo'lim faqat bazadagi haqiqiy yozuvlarni ko'rsatadi; yozuv bo'lmasa
 * bo'sh holat chiqadi, o'ylab topilgan nishonlar emas.
 */
export function QualitySection({
  locale,
  messages,
  certificates,
}: {
  locale: Locale;
  messages: Messages;
  certificates: PublicCertificate[] | null;
}) {
  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow={messages.home.qualityEyebrow}
          title={<TextReveal as="span">{messages.home.qualityTitle}</TextReveal>}
        />

        <div className="mt-12">
          {certificates === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : certificates.length === 0 ? (
            <EmptyState message={messages.home.qualityEmpty} />
          ) : (
            <Reveal as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger>
              {certificates.map((certificate) => (
                <GlassCard as="li" key={certificate.id} className="flex flex-col gap-2 p-6">
                  <h3 className="display-4">{text(certificate.title, locale)}</h3>

                  {certificate.issuer !== null && (
                    <p className="text-sm text-[var(--color-fg-muted)]">{certificate.issuer}</p>
                  )}

                  {certificate.issuedAt !== null && (
                    <p className="text-sm text-[var(--color-fg-subtle)]">
                      <time dateTime={certificate.issuedAt}>
                        {formatDate(certificate.issuedAt, locale)}
                      </time>
                    </p>
                  )}
                </GlassCard>
              ))}
            </Reveal>
          )}
        </div>
      </Container>
    </Section>
  );
}
