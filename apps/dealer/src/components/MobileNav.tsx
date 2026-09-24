'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type DealerNavGroup } from '@/lib/navigation';

/**
 * Mobil menyu — gorizontal lenta.
 *
 * NEGA "burger" EMAS: diler telefonda bo'limlar orasida TEZ-TEZ
 * yuradi (katalog → savat → buyurtmalar). Har safar menyuni ochish
 * ikki bosish qo'shardi. Gorizontal lenta bir bosishda qoldiradi.
 *
 * Qurilmagan bo'lim bu yerda UMUMAN ko'rsatilmaydi: tor ekranda
 * "tez orada" yozuvi faqat joy egallaydi — reja yon menyuda ko'rinadi.
 */
export function MobileNav({ groups }: { groups: DealerNavGroup[] }) {
  const pathname = usePathname();
  const items = groups.flatMap((group) => group.items).filter((item) => item.ready);

  return (
    <nav
      aria-label="Bo‘limlar"
      className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] px-2 py-2 lg:hidden"
    >
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              // Barmoq uchun: eng kam 44px balandlik.
              'flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm whitespace-nowrap transition-colors',
              active
                ? 'bg-[var(--color-glass)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)]',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
