import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Messages } from '@/i18n/dictionary';
import { mainNav, secondaryNav } from '@/lib/navigation';
import { Container } from './Container';

export function Footer({ locale, messages }: { locale: Locale; messages: Messages }) {
  const year = new Date().getFullYear();
  const columns = [mainNav(locale, messages), secondaryNav(locale, messages)];

  return (
    <footer className="mt-auto border-t border-[var(--color-line)] py-12">
      <Container as="div" className="flex flex-col gap-10">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight">BARFF</p>
            {/*
              Kompaniya faktlari (manzil, telefon) BARFF tasdiqlamaguncha
              yozilmaydi (CLAUDE.md §1) — ular `/contact` sahifasida
              sozlamadan keladi.
            */}
            <p className="text-sm text-[var(--color-fg-subtle)]">{messages.footer.madeNote}</p>
          </div>

          {/*
            Bu HAQIQIY navigatsiya, shuning uchun `<nav>`. Ekran o'quvchi
            uni "pastki navigatsiya" deb e'lon qiladi.
          */}
          <nav aria-label={messages.footer.rights} className="flex gap-12">
            {columns.map((column, index) => (
              <ul key={index === 0 ? 'main' : 'secondary'} className="flex flex-col gap-3">
                {column.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>

        <p className="text-sm text-[var(--color-fg-subtle)]">
          © {year} BARFF. {messages.footer.rights}.
        </p>
      </Container>
    </footer>
  );
}
