'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { processSteps } from '@/data/process';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { EASE, SCROLL_TRIGGER } from '@/lib/motion';

/**
 * Ishlab chiqarish jarayoni: FRUIT → SELECTION → PROCESS → QUALITY → BOTTLE.
 *
 * Bosqichlar scroll bo'yicha ketma-ket "yonadi": faol bosqichning raqami, rasmi va
 * matni to'liq ko'rinadi, qolganlari susayadi. Progres chizig'i scroll bilan to'ladi —
 * foydalanuvchi jarayonning qayerida turganini ko'radi (13-qoida: sababi bor harakat).
 *
 * `prefers-reduced-motion` da bosqichlar oddiy ro'yxat bo'lib, hammasi to'liq ko'rinadi.
 */
export function ProcessSection() {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { locale, t } = useLocale();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const context = gsap.context(() => {
      // Progres chizig'i scroll bilan to'ladi.
      gsap.fromTo(
        '[data-process-progress]',
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 70%',
            end: 'bottom 80%',
            scrub: true,
          },
        },
      );

      // Har bosqich o'z navbatida faollashadi.
      gsap.utils.toArray<HTMLElement>('[data-process-step]').forEach((step) => {
        gsap.fromTo(
          step,
          { autoAlpha: 0.25, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            ease: EASE.out3,
            scrollTrigger: {
              trigger: step,
              start: SCROLL_TRIGGER.revealStart,
              end: 'center 55%',
              scrub: true,
            },
          },
        );
      });
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      context.revert();
    };
  }, [prefersReducedMotion]);

  if (processSteps.length === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-labelledby="process-title"
      className="container-barff py-24 md:py-32"
    >
      <TextReveal as="h2" id="process-title" type="lines" className="text-section mb-6 block">
        {t.sections.process}
      </TextReveal>

      {/* Bosqichlar zanjiri: FRUIT → SELECTION → PROCESS → QUALITY → BOTTLE */}
      <p aria-hidden="true" className="text-label text-muted mb-4 flex flex-wrap gap-2">
        {processSteps.map((step, index) => (
          <span key={step.id}>
            {step.label}
            {index < processSteps.length - 1 && <span className="mx-2">→</span>}
          </span>
        ))}
      </p>

      <div aria-hidden="true" className="bg-line mb-16 h-px w-full">
        <span data-process-progress className="bg-foreground block h-px w-full origin-left" />
      </div>

      <ol className="flex flex-col gap-16 md:gap-24">
        {processSteps.map((step) => (
          <li
            key={step.id}
            data-process-step
            className="grid items-center gap-6 md:grid-cols-[6rem_1fr_10rem] md:gap-10"
          >
            <span className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none font-extrabold tracking-[-0.03em] opacity-20 tabular-nums">
              {step.index}
            </span>

            <div className="flex flex-col gap-2">
              <span className="text-label text-muted">{step.label}</span>
              <h3 className="font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight font-bold tracking-[-0.02em]">
                {step.title[locale]}
              </h3>
              <p className="text-muted max-w-[48ch] text-sm">{step.description[locale]}</p>
            </div>

            {step.image && (
              <Image
                src={step.image.src}
                alt=""
                aria-hidden="true"
                width={step.image.width ?? 320}
                height={step.image.height ?? 320}
                sizes="160px"
                className="h-24 w-auto justify-self-start object-contain md:h-32 md:justify-self-center"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
