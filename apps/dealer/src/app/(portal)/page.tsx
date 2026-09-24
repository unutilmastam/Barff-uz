import { type Metadata } from 'next';
import { Badge, GlassCard } from '@barff/ui';
import { DEALER_STATUS_LABELS } from '@/lib/labels';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Boshqaruv paneli' };
export const dynamic = 'force-dynamic';

/**
 * Diler boshqaruv paneli (CLAUDE.md §5).
 *
 * IKKI HOLAT, va ular butunlay boshqacha ko'rinadi:
 *
 *   1. TASDIQLANMAGAN — sahifa ariza holatini ko'rsatadi va boshqa
 *      hech narsani. Bo'sh "0 ta buyurtma" kartochkalarini ko'rsatish
 *      dilerni "nimadir buzilgan" deb o'ylashga majbur qilardi.
 *   2. TASDIQLANGAN — savdo ko'rsatkichlari.
 *
 * Buyurtma va yetkazib berish ma'lumotlari S26–S31 da keladi;
 * hozir ular o'rindosh, va o'rindosh EKANI ochiq yozilgan — soxta
 * raqam ko'rsatilmaydi (CLAUDE.md §1).
 */
export default async function DashboardPage() {
  const session = await getSession();
  const dealer = session?.dealer ?? null;

  if (!isActive(session)) {
    const status = dealer?.status ?? 'PENDING';

    return (
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Ariza holati</p>
        <h1 className="display-3 mt-2">{DEALER_STATUS_LABELS[status].title}</h1>

        <p className="lead mt-4">{DEALER_STATUS_LABELS[status].body}</p>

        {dealer?.statusReason !== null && dealer?.statusReason !== undefined && (
          <GlassCard className="mt-6 p-5">
            <p className="text-[length:var(--text-label)] font-medium tracking-[var(--text-label--letter-spacing)] text-[var(--color-fg-subtle)] uppercase">
              Izoh
            </p>
            <p className="mt-2 text-sm">{dealer.statusReason}</p>
          </GlassCard>
        )}

        <GlassCard className="mt-6 flex flex-col gap-2 p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Kompaniya</p>
          <p className="font-medium">{dealer?.companyName ?? '—'}</p>
        </GlassCard>
      </div>
    );
  }

  const tier = dealer?.tier ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Boshqaruv paneli</p>
        <h1 className="display-3 mt-2">{dealer?.companyName}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="flex flex-col gap-2 p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Holat</p>
          <Badge tone="success">{DEALER_STATUS_LABELS.APPROVED.title}</Badge>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2 p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Daraja</p>
          <p className="text-xl font-semibold">{tier?.name ?? 'Belgilanmagan'}</p>
          {tier !== null && tier.discountBasisPoints > 0 && (
            <p className="text-sm text-[var(--color-fg-muted)]">
              Chegirma {(tier.discountBasisPoints / 100).toFixed(2)}%
            </p>
          )}
        </GlassCard>

        {/*
          Buyurtma va balans S26+ da keladi. Bu yerda NOL ko'rsatish
          xato bo'lardi: "0 ta buyurtma" haqiqat emas, ma'lumot hali
          YO'Q (CLAUDE.md §1).
        */}
        <GlassCard className="flex flex-col gap-2 p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Buyurtmalar</p>
          <p className="text-sm text-[var(--color-fg-subtle)]">Tez orada</p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2 p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Balans</p>
          <p className="text-sm text-[var(--color-fg-subtle)]">Tez orada</p>
        </GlassCard>
      </div>
    </div>
  );
}
