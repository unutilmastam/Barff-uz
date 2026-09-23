import Link from 'next/link';
import { type Locale, type PublicHomepageSection } from '@barff/types';
import { Button } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { routeReady } from '@/lib/routes';
import { HeroVisual } from '@/motion/HeroVisual';

/**
 * Bosh ekran.
 *
 * LCP elementi — SARLAVHA, effekt emas (ROADMAP S12). Shuning uchun
 * matn serverda chiziladi va hech narsani kutmaydi; fon rasmi
 * bo'lsa ham u matnning ORTIDA, alohida qatlamda turadi.
 *
 * 3D sahna S17 da shu bo'lim ichiga qo'shiladi — o'shanda ham matn
 * birinchi bo'lib ko'rinishi shart.
 */
export function HeroSection({
  locale,
  messages,
  section,
}: {
  locale: Locale;
  messages: Messages;
  section: PublicHomepageSection | undefined;
}) {
  const title = text(section?.heading, locale, messages.home.heroTitle);
  const subtitle = text(section?.subheading, locale, messages.home.heroSubtitle);
  const ctaLabel = text(section?.ctaLabel, locale, messages.home.heroCta);
  const ctaHref = section?.ctaHref ?? `/${locale}/products`;

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-line)]">
      {/*
        Uch o'lchamli sahna (yoki uning zaxirasi) MATN ORTIDA turadi va
        `ssr: false` bilan keyin yuklanadi — sarlavha undan oldin
        chiziladi (CLAUDE.md §26).
      */}
      <HeroVisual />

      {section?.image != null && (
        <div aria-hidden className="absolute inset-0">
          <ApiImage
            image={section.image}
            alt=""
            sizes="100vw"
            priority
            className="h-full w-full object-cover opacity-35"
          />
          {/* Matn ustidagi kontrast fon rasmiga BOG'LIQ bo'lmasligi uchun. */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-ink-900)_15%,color-mix(in_oklab,var(--color-ink-900)_60%,transparent))]" />
        </div>
      )}

      <Container as="div" className="relative flex min-h-[70vh] flex-col justify-center py-20">
        <div className="max-w-3xl">
          {/* Sahifada bitta `<h1>` — ekran o'quvchida tuzilma to'g'ri o'qiladi. */}
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {title}
          </h1>

          <p className="mt-6 max-w-xl text-lg text-[var(--color-fg-muted)] sm:text-xl">
            {subtitle}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>

            {routeReady('becomePartner') && (
              <Button asChild size="lg" variant="secondary">
                <Link href={`/${locale}/become-partner`}>{messages.home.heroSecondaryCta}</Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
