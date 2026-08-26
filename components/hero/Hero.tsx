'use client';

import { useLayoutEffect, useRef } from 'react';
import { FloatingFruit } from '@/components/hero/FloatingFruit';
import { HeroParticles } from '@/components/hero/HeroParticles';
import { HeroProduct } from '@/components/hero/HeroProduct';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { heroFruits, heroHeadline, heroParticlesEnabled, heroSubline, heroTags } from '@/data/hero';
import { useIntroFinished } from '@/hooks/useIntroFinished';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { CONTENT_PENDING } from '@/lib/content';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE, HERO_FRUIT, HERO_TIMELINE, STAGGER } from '@/lib/motion';

/**
 * HERO — ~100vh, saytning birinchi ekrani.
 *
 * Vizual ierarxiya (11-qoida): mahsulot PRIMARY, sarlavha/CTA SECONDARY,
 * meva va zarrachalar DECORATIVE — dekor mahsulotdan orqada turadi.
 *
 * Timeline (spec, sekundlarda) — qiymatlar `lib/motion.ts` → `HERO_TIMELINE` dan:
 *   0.0 fon · 0.2 logo · 0.4 sarlavha · 0.6 stagger · 0.8 mahsulot ·
 *   1.0 meva · 1.2 CTA · 1.5 float boshlanadi
 *
 * Mahsulot, meva va zarrachalar o'z timeline'ini o'zi quradi (bir xil konstantalarga
 * tayangani uchun vaqtlar mos tushadi) — Hero qolgan qatlamlarni boshqaradi.
 *
 * Hamma narsa Loader tugagach boshlanadi, aks holda animatsiya loader ortida o'tib ketardi.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const introFinished = useIntroFinished();
  const { locale, t } = useLocale();

  // Mobilda kamroq meva — sodda motion (spec talabi).
  const desktopFruits = heroFruits;
  const mobileFruits = heroFruits.filter((fruit) => fruit.mobile).slice(0, HERO_FRUIT.mobileMaxCount);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !introFinished) return;

    const context = gsap.context(() => {
      const duration = prefersReducedMotion ? 0.01 : DURATION.hero;
      const rise = prefersReducedMotion ? 0 : 40;

      const timeline = gsap.timeline({ defaults: { ease: EASE.expo, duration } });

      timeline
        .fromTo('[data-hero-bg]', { opacity: 0 }, { opacity: 1 }, HERO_TIMELINE.background)
        .fromTo(
          '[data-hero-logo]',
          { opacity: 0, y: rise },
          { opacity: 1, y: 0 },
          HERO_TIMELINE.logo,
        )
        .fromTo(
          '[data-hero-heading]',
          { opacity: 0, y: rise * 1.5 },
          { opacity: 1, y: 0 },
          HERO_TIMELINE.heading,
        )
        .fromTo(
          '[data-hero-stagger]',
          { opacity: 0, y: rise },
          {
            opacity: 1,
            y: 0,
            stagger: prefersReducedMotion ? 0 : STAGGER.text,
            duration: prefersReducedMotion ? 0.01 : DURATION.section,
          },
          HERO_TIMELINE.headingStagger,
        )
        .fromTo(
          '[data-hero-cta]',
          { opacity: 0, y: rise },
          { opacity: 1, y: 0, duration: prefersReducedMotion ? 0.01 : DURATION.section },
          HERO_TIMELINE.cta,
        )
        .fromTo(
          '[data-hero-scroll]',
          { opacity: 0 },
          { opacity: 1, duration: prefersReducedMotion ? 0.01 : DURATION.section },
          HERO_TIMELINE.cta,
        );
    }, root);

    return () => context.revert();
  }, [introFinished, prefersReducedMotion]);

  return (
    <section
      ref={rootRef}
      // Header shaffof holda ustidan tushadi — hero to'liq ekranni egallaydi.
      className="relative flex min-h-screen flex-col overflow-hidden"
    >
      <div data-hero-bg className="bg-background absolute inset-0 -z-30 opacity-0" />

      {heroParticlesEnabled && <HeroParticles />}

      {/* DEKOR — mahsulotdan orqada. Rasm bo'lmasa hech narsa chizilmaydi. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="hidden md:block">
          {desktopFruits.map((fruit, index) => (
            <FloatingFruit key={fruit.id} {...fruit} alt="" delay={index * 0.08} />
          ))}
        </div>
        <div className="md:hidden">
          {mobileFruits.map((fruit, index) => (
            <FloatingFruit key={fruit.id} {...fruit} alt="" delay={index * 0.08} />
          ))}
        </div>
      </div>

      <div className="container-barff relative flex flex-1 flex-col justify-center gap-6 pt-24 pb-20 md:grid md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-16 md:py-28">
        <div className="flex flex-col gap-4 md:gap-6">
          <p data-hero-logo className="text-label text-muted opacity-0">
            BARFF
          </p>

          <h1 data-hero-heading className="text-hero opacity-0">
            {heroHeadline ? heroHeadline[locale] : CONTENT_PENDING}
          </h1>

          <p data-hero-stagger className="text-body text-muted max-w-[42ch] opacity-0">
            {heroSubline ? heroSubline[locale] : CONTENT_PENDING}
          </p>

          {/* Teglar — mahsulot da'volari, mijoz tasdiqlamaguncha bo'sh. */}
          <ul className="flex flex-wrap gap-3">
            {heroTags.length > 0 ? (
              heroTags.map((tag) => (
                <li
                  key={tag.uz}
                  data-hero-stagger
                  className="border-line text-label rounded-full border px-4 py-2 opacity-0"
                >
                  {tag[locale]}
                </li>
              ))
            ) : (
              <li
                data-hero-stagger
                className="border-line text-label text-muted rounded-full border border-dashed px-4 py-2 opacity-0"
              >
                {CONTENT_PENDING}
              </li>
            )}
          </ul>

          <div data-hero-cta className="opacity-0">
            <Button href="/products" size="lg" data-cursor="open">
              {t.hero.cta}
            </Button>
          </div>
        </div>

        {/* PRIMARY — asosiy vizual fokus. */}
        <HeroProduct />
      </div>

      <div
        data-hero-scroll
        aria-hidden="true"
        className="text-label text-muted absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 opacity-0"
      >
        <span>{t.hero.scroll}</span>
        <span className="bg-line block h-10 w-px" data-scroll-line />
      </div>
    </section>
  );
}
