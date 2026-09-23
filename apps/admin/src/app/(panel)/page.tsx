import { GlassCard } from '@barff/ui';
import { visibleNav } from '@/lib/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Boshqaruv paneli.
 *
 * S18 doirasi — QOBIQ: kirish, sessiya, menyu va jadval komponenti.
 * Haqiqiy ko'rsatkichlar (buyurtmalar, savdo, arizalar) tegishli
 * modullar qurilgach qo'shiladi (S19-S20), shuning uchun bu yerda
 * o'ylab topilgan raqam YO'Q.
 */
export default async function DashboardPage() {
  const session = await getSession();
  const groups = visibleNav(session);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Boshqaruv paneli</h1>
        <p className="mt-2 text-[var(--color-fg-muted)]">
          Sizga ochiq bo‘lgan bo‘limlar quyida. Ro‘yxat rollaringizga qarab tuziladi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <GlassCard key={item.href} className="p-5">
              <p className="text-xs tracking-widest text-[var(--color-fg-subtle)] uppercase">
                {group.label}
              </p>
              <p className="mt-1 font-medium">{item.label}</p>
              <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                {item.ready ? item.permission : 'tez orada'}
              </p>
            </GlassCard>
          )),
        )}
      </div>

      <GlassCard className="p-5">
        <h2 className="font-medium">Ko‘rsatkichlar</h2>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Buyurtmalar, savdo va yetkazib berish ko‘rsatkichlari tegishli modullar qurilgach
          qo‘shiladi. O‘ylab topilgan raqam ko‘rsatilmaydi.
        </p>
      </GlassCard>
    </div>
  );
}
