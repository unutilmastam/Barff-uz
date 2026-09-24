import { type Locale, type PublicProductionStep } from '@barff/types';
import { GlassCard, Section, SectionHeader } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { Reveal } from '@/motion/Reveal';

/**
 * Ishlab chiqarish jarayoni (CLAUDE.md §4).
 *
 * Bosqichlar API'dan keladi — ular CMS orqali boshqariladi va
 * tartibi `displayOrder` bilan belgilanadi. Bu yerda ro'yxat qattiq
 * yozilmaydi: aks holda CMS'dagi o'zgarish saytga ta'sir qilmasdi.
 */
export function ProcessSection({
  locale,
  messages,
  steps,
}: {
  locale: Locale;
  messages: Messages;
  steps: PublicProductionStep[] | null;
}) {
  return (
    <Section tone="raised">
      <Container>
        <SectionHeader eyebrow={messages.home.processEyebrow} title={messages.home.processTitle} />

        <div className="mt-12">
          {steps === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : steps.length === 0 ? (
            <EmptyState message={messages.common.empty} />
          ) : (
            // `<ol>` — bosqichlar TARTIBLI ro'yxat; ekran o'quvchi ham
            // "1-elementdan 8-gacha" deb o'qiydi.
            <Reveal as="ol" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger>
              {steps.map((step, index) => (
                <GlassCard as="li" key={step.id} className="flex flex-col gap-3 p-6">
                  <span className="text-sm font-medium tabular-nums text-[var(--color-accent-text)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-medium">{text(step.title, locale, step.slug)}</h3>
                  {step.description !== null && (
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {text(step.description, locale)}
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
