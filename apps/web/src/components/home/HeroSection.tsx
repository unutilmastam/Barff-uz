import Link from 'next/link';
import { type Locale, type PublicHomepageSection } from '@barff/types';
import { Button } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { routeReady } from '@/lib/routes';
import { HeroBanner } from '@/components/home/HeroBanner';
import { HeroField } from '@/motion/HeroField';
import { Magnetic } from '@/motion/Magnetic';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Bosh ekran.
 *
 * LCP elementi — SARLAVHA va banner, effekt emas. Matn serverda
 * chiziladi va hech narsani kutmaydi.
 *
 * Banner (B01) — BARFF taqdim etgan keng rasm: chapda bo'sh qorong'i
 * joy, o'ngda shishalar. Shuning uchun matn chapga qo'yiladi. Rasm
 * har doim QORONG'I, shuning uchun bo'lim mavzudan qat'i nazar
 * `color-scheme: dark` bilan chiziladi — matn ranglari tokenlardan
 * keladi va ikkala mavzuda ham bir xil o'qiladi (§16).
 *
 * CMS'da `hero` bo'limiga rasm biriktirilsa, o'sha rasm ishlatiladi;
 * rasm bo'lmasa — repodagi banner. 3D shisha karuseli hero ostida
 * alohida lavhada (`ProductStageSection`).
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
    <section
      style={{ colorScheme: 'dark' }}
      className="relative overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-ink-900)] text-[var(--color-fg)]"
    >
      <div className="relative aspect-[808/704] w-full md:absolute md:inset-0 md:aspect-auto">
        {section?.image != null ? (
          <ApiImage
            image={section.image}
            alt={messages.home.heroBottleAlt}
            sizes="100vw"
            priority
            className="h-full w-full object-cover object-[78%_center]"
          />
        ) : (
          <HeroBanner alt={messages.home.heroBottleAlt} />
        )}

        {/*
          Matn ustidagi kontrast rasmga BOG'LIQ bo'lmasligi uchun: desktopda
          chapdan, mobilda pastdan fon rangiga o'tadi.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-ink-900)_2%,transparent_55%)] md:bg-[linear-gradient(to_right,var(--color-ink-900)_6%,color-mix(in_oklab,var(--color-ink-900)_55%,transparent)_34%,transparent_62%)]"
        />
      </div>

      {/* Banner ustidagi ambient zarrachalar: faqat kuchli keng ekranda, qolgan joyda banner o'zi yetarli. */}
      <HeroField />

      <Container
        as="div"
        className="relative -mt-14 py-10 md:mt-0 md:flex md:min-h-[86vh] md:items-center md:py-20"
      >
        <div className="md:max-w-[min(36rem,50%)]">
          <p className="eyebrow text-[var(--color-fg-subtle)]">BARFF</p>

          {/* Sahifada bitta `<h1>` — ekran o'quvchida tuzilma to'g'ri o'qiladi. */}
          <TextReveal
            as="h1"
            immediate
            className="display-1 mt-4 block md:text-[length:clamp(3rem,6.2vw,6.25rem)]"
          >
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
      </Container>
    </section>
  );
}
