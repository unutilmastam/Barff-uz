'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useIntroFinished } from '@/hooks/useIntroFinished';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE, HERO_PARTICLES, HERO_TIMELINE } from '@/lib/motion';

/**
 * Hero foni uchun juda yengil zarrachalar qatlami.
 *
 * IXTIYORIY va standart holatda O'CHIQ (`data/hero.ts` → `heroParticlesEnabled`).
 * Yoqilganda ham mahsulotdan orqada (`-z-20`) va past shaffoflikda turadi —
 * asosiy fokusni bosmasligi shart (BUILD_PLAN 11- va 13-qoidalar).
 */
export function HeroParticles() {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const introFinished = useIntroFinished();

  // Server va klient bir xil qiymat chiqarishi uchun pozitsiyalar deterministik.
  const particles = useMemo(
    () =>
      Array.from({ length: HERO_PARTICLES.count }, (_, index) => {
        const seed = (index + 1) * 0.6180339887;
        const fraction = seed - Math.floor(seed);
        return {
          id: index,
          x: (fraction * 100).toFixed(2),
          y: (((index * 37) % 100) + fraction).toFixed(2),
          size:
            HERO_PARTICLES.minSize +
            fraction * (HERO_PARTICLES.maxSize - HERO_PARTICLES.minSize),
          duration:
            HERO_PARTICLES.minDuration +
            fraction * (HERO_PARTICLES.maxDuration - HERO_PARTICLES.minDuration),
        };
      }),
    [],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !introFinished || prefersReducedMotion) return;

    const context = gsap.context(() => {
      // Ko'rinish va suzish AJRATILGAN: aks holda zarracha o'zining 6–12 sekundlik
      // suzish davri bo'yicha sekin paydo bo'lardi va amalda ko'rinmasdi.
      gsap.to('[data-particle]', {
        opacity: HERO_PARTICLES.opacity,
        duration: DURATION.section,
        ease: EASE.out2,
        stagger: { each: 0.06, from: 'random' },
        delay: HERO_TIMELINE.fruit,
      });

      gsap.utils.toArray<HTMLElement>('[data-particle]').forEach((particle, index) => {
        gsap.to(particle, {
          y: -40,
          duration: particles[index]?.duration ?? HERO_PARTICLES.minDuration,
          ease: EASE.inOut3,
          repeat: -1,
          yoyo: true,
          delay: HERO_TIMELINE.float + index * 0.08,
        });
      });
    }, root);

    return () => context.revert();
  }, [introFinished, prefersReducedMotion, particles]);

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
      {particles.map((particle) => (
        <span
          key={particle.id}
          data-particle
          className="bg-muted absolute rounded-full opacity-0"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
        />
      ))}
    </div>
  );
}
