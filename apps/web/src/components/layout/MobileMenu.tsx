'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sheet } from '@barff/ui';
import { type NavLink } from '@/lib/navigation';

/**
 * Mobil menyu.
 *
 * Yon panel `Sheet` ustida — fokus ichida ushlanadi, `Escape` yopadi,
 * orqa fon skroll qilinmaydi (Radix zimmasida).
 *
 * Havola bosilganda menyu O'ZI yopiladi: Next sahifani almashtiradi,
 * lekin komponent yo'q qilinmaydi, shuning uchun ochiq panel yangi
 * sahifa ustida osilib qolardi.
 */
export function MobileMenu({
  links,
  openLabel,
  closeLabel,
  title,
}: {
  links: NavLink[];
  openLabel: string;
  closeLabel: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={title}
      closeLabel={closeLabel}
      trigger={
        <button
          type="button"
          aria-label={openLabel}
          className="inline-flex size-11 items-center justify-center rounded-md text-[var(--color-fg)] transition-colors hover:bg-[var(--color-glass)] sm:hidden"
        >
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      }
    >
      <nav>
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                // Teginish maydoni kamida 44px — mobil uchun tavsiya.
                className="flex min-h-11 items-center border-b border-[var(--color-line)] py-3 text-lg transition-colors hover:text-[var(--color-brand-400)]"
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Sheet>
  );
}
