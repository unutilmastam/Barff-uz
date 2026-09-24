import { Section, SectionHeader, StatBlock } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { PENDING_VALUE } from '@/lib/mock-data';
import { Reveal } from '@/motion/Reveal';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Kompaniya raqamlari.
 *
 * CLAUDE.md §4: FAQAT tasdiqlangan faktlar. Hozircha BARFF tomonidan
 * tasdiqlangan raqam yo'q, shuning uchun qiymat o'rnida `—` turadi va
 * har bir qator `MOCK` deb belgilangan. O'ylab topilgan raqam
 * qo'yilsa, u ertaga haqiqatdek tarqalib ketardi.
 */
export function StatsSection({ messages }: { messages: Messages }) {
  const stats = [
    { value: PENDING_VALUE, label: messages.home.statFounded, unverified: true },
    { value: PENDING_VALUE, label: messages.home.statCapacity, unverified: true },
    { value: PENDING_VALUE, label: messages.home.statProducts, unverified: true },
    { value: PENDING_VALUE, label: messages.home.statRegions, unverified: true },
  ];

  return (
    <Section tone="raised">
      <Container>
        <SectionHeader
          eyebrow={messages.home.statsEyebrow}
          title={<TextReveal as="span">{messages.home.statsTitle}</TextReveal>}
        />

        {/* Ketma-ket EMAS: `StatBlock` bitta `<dl>` chizadi, ya'ni
            bo'linadigan bola yo'q. */}
        <Reveal className="mt-12">
          <StatBlock stats={stats} unverifiedLabel={messages.common.mockBadge} />
        </Reveal>

        <p className="mt-8 max-w-2xl text-sm text-[var(--color-fg-muted)]">
          {messages.common.mockNotice}
        </p>
      </Container>
    </Section>
  );
}
