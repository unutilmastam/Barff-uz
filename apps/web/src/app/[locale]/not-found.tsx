import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';

/**
 * 404 — til segmenti ichida.
 *
 * DIQQAT: `not-found.tsx` `params` ni OLMAYDI (Next.js uni bu faylga
 * uzatmaydi), shuning uchun til standart qiymatda qoladi. To'g'ri tilda
 * ko'rsatish S15 da, i18n to'liq qurilganda hal qilinadi.
 */
export default async function LocaleNotFound() {
  const messages = await getMessages(DEFAULT_LOCALE);

  return (
    <Container as="section" className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="text-sm font-medium tracking-widest text-[var(--color-brand-400)]">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        {messages.errors.notFoundTitle}
      </h1>
      <p className="mt-4 max-w-lg text-[var(--color-fg-muted)]">{messages.errors.notFoundBody}</p>

      <div className="mt-8">
        <Link
          href={`/${DEFAULT_LOCALE}`}
          className="rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)]"
        >
          {messages.errors.notFoundCta}
        </Link>
      </div>
    </Container>
  );
}
