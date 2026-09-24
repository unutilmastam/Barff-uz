import Link from 'next/link';
import { type Locale, type PublicHomepageSection } from '@barff/types';
import { Button } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { routeReady } from '@/lib/routes';
import { HeroComposition } from '@/motion/HeroComposition';
import { HeroField } from '@/motion/HeroField';
import { Magnetic } from '@/motion/Magnetic';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Bosh ekran.
 *
 * LCP elementi — SARLAVHA, effekt emas. Shuning uchun matn serverda
 * chiziladi va hech narsani kutmaydi; kompozitsiya esa yonida,
 * alohida ustunda turadi.
 *
 * Tartib 2026-08-26 qurilishidan: chapda yorliq → sarlavha → matn →
 * CTA, o'ngda shisha kompozitsiyasi. Sarlavha `TextReveal` bilan
 * qatorma-qator ko'tariladi, lekin harakat o'chiq bo'lsa ham u
 * JOYIDA turadi.
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
        WebGL zarracha maydoni — KONTENT ORTIDA va butunlay bezak.
        `three` dinamik yuklanadi va faqat kuchli, keng ekranli,
        WebGL'li qurilmada ishga tushadi; qolgan hamma joyda hero
        tekis kompozitsiya bilan to'liq ishlaydi.
      */}
      <HeroField />
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

      <Container
        as="div"
        className="relative grid min-h-[86vh] items-center gap-12 py-20 md:grid-cols-[1.05fr_0.95fr] md:gap-16"
      >
        <div>
          <p className="eyebrow text-[var(--color-fg-subtle)]">BARFF</p>

          {/* Sahifada bitta `<h1>` — ekran o'quvchida tuzilma to'g'ri o'qiladi. */}
          <TextReveal as="h1" immediate className="display-1 mt-4 block">
            {title}
          </TextReveal>

          <p className="lead mt-6 max-w-[42ch]">{subtitle}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Magnetic>
              <Button asChild size="lg">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </Magnetic>

            {routeReady('becomePartner') && (
              <Magnetic>
                <Button asChild size="lg" variant="secondary">
                  <Link href={`/${locale}/become-partner`}>{messages.home.heroSecondaryCta}</Link>
                </Button>
              </Magnetic>
            )}
          </div>
        </div>

        <HeroComposition bottleAlt={messages.home.heroBottleAlt} />
      </Container>
    </section>
  );
}
