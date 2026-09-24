import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';

/**
 * 404 — til segmenti ichida.
 *
 * DIQQAT: bu sahifa STANDART tilda chiqadi.
 *
 * Sabab: `not-found.tsx` `params` ni olmaydi, so'rovdan tilni o'qish
 * uchun esa `cookies()` kerak bo'ladi — u chaqirilishi bilan butun til
 * shoxobchasi DINAMIK bo'lib qoladi va bosh sahifa ham, mahsulot
 * sahifalari ham oldindan tayyorlanmay qo'yadi (buni tekshirdim: SSG
 * belgisi va `revalidate` build jadvalidan yo'qoladi). Uch sahifani
 * statik bo'lishdan mahrum qilish 404 matnining tilidan muhimroq.
 *
 * Indekslashdan himoya kerak emas: Next 404 javobiga `noindex` ni
 * O'ZI qo'shadi (tekshirilgan).
 */
export default async function LocaleNotFound() {
  const messages = await getMessages(DEFAULT_LOCALE);

  return (
    <Container as="section" className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="text-sm font-medium tracking-widest text-[var(--color-accent-text)]">404</p>
      <h1 className="display-3 mt-4">{messages.errors.notFoundTitle}</h1>
      <p className="mt-4 max-w-lg text-[var(--color-fg-muted)]">{messages.errors.notFoundBody}</p>

      <div className="mt-8">
        <Link
          href={`/${DEFAULT_LOCALE}`}
          className="rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent-on)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          {messages.errors.notFoundCta}
        </Link>
      </div>
    </Container>
  );
}
