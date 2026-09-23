import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Messages } from '@/i18n/dictionary';
import { mainNav } from '@/lib/navigation';
import { routeReady } from '@/lib/routes';
import { Container } from './Container';
import { LocaleSwitcher } from './LocaleSwitcher';
import { MobileMenu } from './MobileMenu';

/**
 * Sayt sarlavhasi.
 *
 * Havolalar `navigation.ts` dagi YAGONA ro'yxatdan keladi — sarlavha,
 * pastki qism va sitemap bir-biridan ajralib ketmasligi uchun. Qurilmagan
 * sahifa ro'yxatga tushmaydi: u 404 berishi ustiga, Next uni oldindan
 * yuklamoqchi bo'lib so'rovni osiltirib qo'yadi (`routes.ts`).
 *
 * Kengroq ekranda havolalar qatorda; mobilda yon menyuda — sakkizta
 * havola 360px ga sig'masdi.
 */
export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const links = mainNav(locale, messages);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink-900)_85%,transparent)] backdrop-blur-md">
      <Container as="div" className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${locale}`}
          className="text-xl font-semibold tracking-tight text-[var(--color-fg)]"
        >
          BARFF
        </Link>

        <nav aria-label={messages.nav.home} className="hidden gap-5 sm:flex lg:gap-6">
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

        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher locale={locale} label={messages.common.languageSwitcher} />

          {routeReady('becomePartner') && (
            <Link
              href={`/${locale}/become-partner`}
              className="hidden rounded-full bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)] lg:inline-block"
            >
              {messages.nav.becomePartner}
            </Link>
          )}

          <MobileMenu
            links={links}
            title={messages.nav.home}
            openLabel={messages.common.openMenu}
            closeLabel={messages.common.closeMenu}
          />
        </div>
      </Container>
    </header>
  );
}
