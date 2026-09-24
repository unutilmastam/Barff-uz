import { fontVariables } from '@/app/fonts';
import { THEME_INIT_SCRIPT } from '@barff/ui';
import Link from 'next/link';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import './globals.css';

/**
 * Til segmentisiz yo'llar uchun 404.
 *
 * Ildiz layout `<html>` chizmagani uchun (u faqat kontentni uzatadi),
 * bu sahifa o'zining `<html>` va `<body>` ini o'zi chizadi.
 */
export default async function RootNotFound() {
  const messages = await getMessages(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE} className={fontVariables}>
      {/* Ko'rinish chizilishdan oldin — `[locale]/layout.tsx` dagidek. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <body className="flex min-h-dvh items-center bg-[var(--color-ink-900)] text-[var(--color-fg)]">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <p className="text-sm font-medium tracking-widest text-[var(--color-accent-text)]">404</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {messages.errors.notFoundTitle}
          </h1>
          <p className="mt-4 max-w-lg text-[var(--color-fg-muted)]">
            {messages.errors.notFoundBody}
          </p>
          <div className="mt-8">
            <Link
              href={`/${DEFAULT_LOCALE}`}
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent-on)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              {messages.errors.notFoundCta}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
