'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { useIntroFinished } from '@/hooks/useIntroFinished';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { parallax } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE, HERO_FRUIT, HERO_TIMELINE } from '@/lib/motion';

interface FloatingFruitProps {
  src: string;
  alt: string;
  /** Konteynerga nisbatan joylashuv (%). */
  x: number;
  y: number;
  scale: number;
  /** Boshlang'ich burilish (deg). */
  rotation: number;
  /** Suzish tezligi — kattaroq = tezroq tebranadi. */
  speed: number;
  /** Scroll parallaks tezligi. */
  parallax: number;
  /** Ketma-ket chiqishi uchun qo'shimcha kechikish (s). */
  delay?: number;
}

/**
 * Hero'dagi dekorativ suzuvchi meva.
 *
 * DEKOR — mahsulotdan ORQADA turadi (`-z-10`) va hech qachon uni bosib ketmaydi
 * (BUILD_PLAN 11-qoida). Kirish spec timeline'idagi 1.0s da.
 */
export function FloatingFruit({
  src,
  alt,
  x,
  y,
  scale,
  rotation,
  speed,
  parallax: parallaxSpeed,
  delay = 0,
}: FloatingFruitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const introFinished = useIntroFinished();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !introFinished) return;
    // Desktop va mobil tarmoqlari CSS bilan ajratilgan — yashirin tarmoqdagi mevalar
    // ham GSAP tween va ScrollTrigger yaratardi. Ular ko'rinmaydi, lekin har kadrda
    // hisoblanadi: mobilda bu bekorga sarflangan ish.
    if (root.offsetParent === null) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        root,
        { opacity: 0, scale: prefersReducedMotion ? scale : scale * 0.7, rotate: rotation },
        {
          opacity: 1,
          scale,
          duration: prefersReducedMotion ? 0.01 : DURATION.section,
          ease: EASE.out4,
          delay: prefersReducedMotion ? 0 : HERO_TIMELINE.fruit + delay,
        },
      );

      if (prefersReducedMotion) return;

      // Har meva o'z tezligida tebranadi — hammasi bir vaqtda ko'tarilmaydi.
      const duration = gsap.utils.clamp(
        HERO_FRUIT.floatDurationMin,
        HERO_FRUIT.floatDurationMax,
        HERO_FRUIT.floatDurationMax / speed,
      );

      gsap.to('[data-fruit-float]', {
        y: -HERO_FRUIT.floatDistance * speed,
        rotate: rotation + 6 * speed,
        duration,
        ease: EASE.inOut3,
        repeat: -1,
        yoyo: true,
        delay: HERO_TIMELINE.float + delay,
      });

      parallax(root, { speed: parallaxSpeed, reduced: prefersReducedMotion });
    }, root);

    return () => context.revert();
  }, [introFinished, prefersReducedMotion, scale, rotation, speed, parallaxSpeed, delay]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 opacity-0"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div data-fruit-float>
        <Image
          src={src}
          alt={alt}
          width={320}
          height={320}
          sizes="(max-width: 768px) 30vw, 16vw"
          className="h-auto w-[min(30vw,10rem)] object-contain select-none"
        />
      </div>
    </div>
  );
}
