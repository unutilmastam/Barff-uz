import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { notFound } from 'next/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <Container as="section" className="flex min-h-[70vh] flex-col justify-center py-20">
      <div className="max-w-3xl">
        {/*
          Sahifada bitta `<h1>`. Sarlavha darajalari ketma-ket bo'lishi
          ekran o'quvchida tuzilma to'g'ri o'qilishini ta'minlaydi.
        */}
        <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {messages.home.heroTitle}
        </h1>

        <p className="mt-6 max-w-xl text-lg text-[var(--color-fg-muted)] sm:text-xl">
          {messages.home.heroSubtitle}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/${locale}`}
            className="rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)]"
          >
            {messages.home.heroCta}
          </Link>

          <Link
            href={`/${locale}`}
            className="rounded-full border border-[var(--color-line-strong)] px-6 py-3 font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-glass)]"
          >
            {messages.home.heroSecondaryCta}
          </Link>
        </div>
      </div>
    </Container>
  );
}
