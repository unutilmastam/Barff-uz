import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Messages } from '@/i18n/dictionary';
import { routeReady } from '@/lib/routes';
import { Container } from './Container';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Sayt sarlavhasi.
 *
 * Navigatsiyada S12 da qurilgan sahifalar bor. Qolgan bo'limlar
 * (`/production`, `/quality`, `/news`, `/contact`) S13 da qo'shilib,
 * shu ro'yxatga kiradi.
 *
 * Qurilmagan sahifaga havola QO'YILMAYDI (`routes.ts` ga qarang):
 * u 404 berishi ustiga, Next uni oldindan yuklamoqchi bo'lib
 * so'rovni osiltirib qo'yadi.
 *
 * Mobilda havolalar ALOHIDA qatorda: 360px kenglikda logotip, ikki
 * havola va til tanlagich bitta qatorga sig'masdi. Qator gorizontal
 * siljiydi, shuning uchun havolalar ko'paysa ham buzilmaydi —
 * to'liq mobil menyu S13 da keladi.
 */
export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const links = [
    { href: `/${locale}/company`, label: messages.nav.company },
    { href: `/${locale}/products`, label: messages.nav.products },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink-900)_85%,transparent)] backdrop-blur-md">
      <Container as="div" className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${locale}`}
          className="text-xl font-semibold tracking-tight text-[var(--color-fg)]"
        >
          BARFF
        </Link>

        <nav aria-label={messages.nav.home} className="hidden gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher locale={locale} label={messages.common.languageSwitcher} />

          {routeReady('becomePartner') && (
            <Link
              href={`/${locale}/become-partner`}
              className="hidden rounded-full bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)] sm:inline-block"
            >
              {messages.nav.becomePartner}
            </Link>
          )}
        </div>
      </Container>

      <Container as="div" className="sm:hidden">
        <nav aria-label={messages.nav.home} className="flex gap-5 overflow-x-auto pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
