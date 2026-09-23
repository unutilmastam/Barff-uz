import { GlassCard, Section } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';

/**
 * Huquqiy hujjat sahifasi (maxfiylik siyosati, foydalanish shartlari).
 *
 * MATN BU YERDA YOZILMAYDI. Maxfiylik siyosati va foydalanish shartlari
 * — huquqiy majburiyat: ular ma'lumot qanday yig'ilishini, qancha
 * saqlanishini va kim bilan bo'lishilishini VA'DA qiladi. Bunday matnni
 * o'ylab topish CLAUDE.md §1 ga ziddir va real xavf tug'diradi.
 *
 * Shuning uchun sahifa MAVJUD (havolalar ishlaydi, marshrut bor), lekin
 * matn BARFF yuridik bo'limidan kelgunicha aniq o'rindosh turadi.
 */
export function LegalPage({ title, messages }: { title: string; messages: Messages }) {
  return (
    <>
      <PageHeader eyebrow={messages.legal.pendingNote} title={title} />

      <Section>
        <Container>
          <GlassCard className="max-w-3xl p-8">
            <p className="text-[var(--color-fg-muted)]">{messages.legal.pending}</p>
          </GlassCard>
        </Container>
      </Section>
    </>
  );
}
