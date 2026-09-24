import { type Metadata } from 'next';
import { Badge, GlassCard } from '@barff/ui';
import { DEALER_STATUS_LABELS } from '@/lib/labels';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Profil' };
export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
} as const;

/**
 * Diler profili.
 *
 * FAQAT O'QISH uchun — hozircha. Tahrirlash endpoint'i serverda bor
 * (`PATCH /dealer/profile`, S22), lekin forma S25 da qo'shiladi:
 * hozirgi bosqichda muhimi diler O'Z ma'lumotini va holatini
 * KO'RISHI.
 *
 * Bu yerda `internalNote` UMUMAN yo'q va bo'lmaydi: u xodimlar
 * uchun va server uni dilerga qaytarmaydi (S22 da test bilan
 * qoplangan).
 */
export default async function ProfilePage() {
  const session = await getSession();
  const dealer = session?.dealer ?? null;
  const status = dealer?.status ?? 'PENDING';

  const rows = [
    { label: 'Kompaniya', value: dealer?.companyName ?? '—' },
    { label: 'Mas’ul shaxs', value: session?.fullName ?? '—' },
    { label: 'Email', value: session?.email ?? '—' },
    { label: 'Daraja', value: dealer?.tier?.name ?? 'Belgilanmagan' },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="eyebrow">Akkaunt</p>
        <h1 className="display-3 mt-2">Profil</h1>
      </div>

      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-fg-muted)]">Holat</p>
          <Badge tone={STATUS_TONE[status]}>{DEALER_STATUS_LABELS[status].title}</Badge>
        </div>

        <dl className="flex flex-col gap-4">
          {rows.map((row) => (
            <div key={row.label} className="border-t border-[var(--color-line)] pt-4">
              <dt className="text-sm text-[var(--color-fg-muted)]">{row.label}</dt>
              <dd className="mt-1 font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>

      <p className="text-sm text-[var(--color-fg-subtle)]">
        Ma’lumotni o‘zgartirish kerak bo‘lsa biz bilan bog‘laning.
      </p>
    </div>
  );
}
