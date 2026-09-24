import { type Metadata } from 'next';
import { GlassCard } from '@barff/ui';

export const metadata: Metadata = { title: 'Yordam' };

/**
 * Yordam sahifasi.
 *
 * ALOQA MA'LUMOTI O'YLAB TOPILMAYDI (CLAUDE.md §1). Haqiqiy telefon
 * va email BARFF tomonidan berilgach shu yerga qo'yiladi
 * (`docs/OPEN-QUESTIONS.md` Q11). Hozir o'rindosh KO'RSATILMAYDI —
 * soxta raqam dilerni bo'sh joyga qo'ng'iroq qilishga majbur qilardi.
 */
export default function SupportPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="eyebrow">Akkaunt</p>
        <h1 className="display-3 mt-2">Yordam</h1>
      </div>

      <GlassCard className="flex flex-col gap-3 p-5">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Savol yoki muammo bo‘lsa, sizga biriktirilgan menejerga murojaat qiling.
        </p>
        <p className="text-sm text-[var(--color-fg-subtle)]">
          Aloqa ma’lumotlari tez orada shu yerda ko‘rinadi.
        </p>
      </GlassCard>
    </div>
  );
}
