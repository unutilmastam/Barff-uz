'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type DealerNavGroup } from '@/lib/navigation';

/**
 * Yon menyu.
 *
 * Faqat foydalanuvchi KO'RA OLADIGAN bo'limlar keladi — ro'yxat
 * serverda filtrlanadi. Yana bir bor: bu kosmetika, ruxsat serverda
 * tekshiriladi.
 */
export function Sidebar({ groups }: { groups: DealerNavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Asosiy menyu" className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-medium tracking-widest text-[var(--color-fg-subtle)] uppercase">
            {group.label}
          </p>

          <ul className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              // `/` faqat aynan mos kelganda faol; qolganlari prefiks
              // bo'yicha, ya'ni ichki sahifada ham ota bo'lim yonadi.
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              /*
                Qurilmagan bo'lim HAVOLA EMAS. U 404 berardi, va Next
                havolani oldindan yuklamoqchi bo'lib so'rovni mangu
                osiltirib qo'yardi (ommaviy saytda o'lchangan).
              */
              if (!item.ready) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-[var(--color-fg-subtle)]"
                    >
                      {item.label}
                      <span className="text-[10px] tracking-wide uppercase">tez orada</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex min-h-10 items-center rounded-lg px-3 text-sm transition-colors',
                      active
                        ? 'bg-[var(--color-glass)] text-[var(--color-fg)]'
                        : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-glass)] hover:text-[var(--color-fg)]',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
