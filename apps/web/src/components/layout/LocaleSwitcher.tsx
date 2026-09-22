'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';

/**
 * Til tanlagich.
 *
 * Joriy yo'lni saqlab qoladi: `/ru/mahsulotlar` dan `/en/mahsulotlar` ga
 * o'tiladi, bosh sahifaga tashlab yuborilmaydi.
 */
export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();

  const pathWithout = (() => {
    const segments = pathname.split('/');
    // segments[0] bo'sh, segments[1] — til kodi.
    return segments.slice(2).join('/');
  })();

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {LOCALES.map((code) => {
        const isActive = code === locale;
        return (
          <Link
            key={code}
            href={`/${code}${pathWithout.length > 0 ? `/${pathWithout}` : ''}`}
            hrefLang={code}
            aria-current={isActive ? 'true' : undefined}
            className={[
              'rounded-md px-2 py-1 text-sm transition-colors',
              isActive
                ? 'bg-[var(--color-glass)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            <span className="sr-only">{LOCALE_LABELS[code]}</span>
            <span aria-hidden="true">{code.toUpperCase()}</span>
          </Link>
        );
      })}
    </nav>
  );
}
