import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Messages } from '@/i18n/dictionary';
import { Container } from './Container';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Sayt sarlavhasi.
 *
 * S06 da navigatsiya havolalari hali mavjud bo'lmagan sahifalarga
 * ko'rsatmaydi — sahifalar S12/S13 da qo'shiladi. Shu sababli hozircha
 * faqat logotip, til tanlagich va CTA bor: ishlamaydigan havola
 * ishlaydiganidan yomonroq.
 */
export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink-900)_85%,transparent)] backdrop-blur-md">
      <Container as="div" className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${locale}`}
          className="text-xl font-semibold tracking-tight text-[var(--color-fg)]"
        >
          BARFF
        </Link>

        <div className="flex items-center gap-3">
          <LocaleSwitcher locale={locale} label={messages.common.languageSwitcher} />

          <Link
            href={`/${locale}`}
            className="hidden rounded-full bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)] sm:inline-block"
          >
            {messages.nav.becomePartner}
          </Link>
        </div>
      </Container>
    </header>
  );
}
