'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { useIntroFinished } from '@/hooks/useIntroFinished';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLocale } from '@/components/providers/LocaleProvider';
import { heroProduct } from '@/data/hero';
import { CONTENT_PENDING } from '@/lib/content';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE, HERO_PRODUCT, HERO_TIMELINE } from '@/lib/motion';

/**
 * Hero'ning ASOSIY vizual fokusi.
 *
 * Uch qatlamli motion, har biri alohida elementda — bir-birining transform'ini bosmaydi:
 *   1. `[data-product-enter]`  — kirish: `scale 0.65 → 1`, `rotate -8° → 0`
 *   2. `[data-product-float]`  — uzluksiz suzish (intro tugagach boshlanadi)
 *   3. `[data-product-tilt]`   — kursorga reaksiya: `mouseX → rotateY`, `mouseY → rotateX`
 *
 * Rasm yo'q bo'lsa soxta 3D yoki chizma qurilmaydi (14-qoida) — o'rniga neytral
 * placeholder ko'rinadi va harakat mantiqi bir xil qoladi.
 */
export function HeroProduct() {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const introFinished = useIntroFinished();
  const { t } = useLocale();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !introFinished) return;

    const context = gsap.context(() => {
      // 1. Kirish — spec timeline'idagi 0.8s.
      gsap.fromTo(
        '[data-product-enter]',
        {
          scale: prefersReducedMotion ? 1 : HERO_PRODUCT.fromScale,
          rotate: prefersReducedMotion ? 0 : HERO_PRODUCT.fromRotation,
          opacity: 0,
        },
        {
          scale: HERO_PRODUCT.toScale,
          rotate: HERO_PRODUCT.toRotation,
          opacity: 1,
          duration: prefersReducedMotion ? 0.01 : DURATION.hero,
          ease: EASE.expo,
          delay: prefersReducedMotion ? 0 : HERO_TIMELINE.product,
        },
      );

      if (prefersReducedMotion) return;

      // 2. Suzish — 1.5s da boshlanadi va uzluksiz davom etadi.
      gsap.to('[data-product-float]', {
        y: -HERO_PRODUCT.floatDistance,
        rotate: HERO_PRODUCT.floatRotation,
        duration: HERO_PRODUCT.floatDuration,
        ease: EASE.inOut3,
        repeat: -1,
        yoyo: true,
        delay: HERO_TIMELINE.float,
      });

      // 3. Kursorga reaksiya — faqat sichqonchali qurilmalarda.
      const media = gsap.matchMedia();
      media.add('(hover: hover) and (pointer: fine)', () => {
        const tilt = root.querySelector<HTMLElement>('[data-product-tilt]');
        if (!tilt) return;

        const rotateY = gsap.quickTo(tilt, 'rotationY', {
          duration: HERO_PRODUCT.tiltSmoothing,
          ease: EASE.out3,
        });
        const rotateX = gsap.quickTo(tilt, 'rotationX', {
          duration: HERO_PRODUCT.tiltSmoothing,
          ease: EASE.out3,
        });

        const onMove = (event: MouseEvent) => {
          const x = (event.clientX / window.innerWidth) * 2 - 1;
          const y = (event.clientY / window.innerHeight) * 2 - 1;
          rotateY(x * HERO_PRODUCT.tiltMax);
          rotateX(-y * HERO_PRODUCT.tiltMax);
        };

        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
      });
    }, root);

    return () => context.revert();
  }, [introFinished, prefersReducedMotion]);

  return (
    <div ref={rootRef} className="relative flex items-center justify-center" data-hero-product>
      <div data-product-enter className="opacity-0">
        <div data-product-float>
          <div data-product-tilt className="[transform-style:preserve-3d] [perspective:1200px]">
            {heroProduct ? (
              <Image
                src={heroProduct.src}
                alt={heroProduct.alt}
                width={heroProduct.width ?? 600}
                height={heroProduct.height ?? 900}
                priority
                sizes="(max-width: 768px) 70vw, 34vw"
                className="h-auto w-[min(42vw,11rem)] object-contain drop-shadow-2xl md:w-[min(70vw,26rem)]"
              />
            ) : (
              <div
                role="img"
                aria-label={`${t.hero.productPending} — ${CONTENT_PENDING}`}
                className="border-line bg-secondary/60 grid h-[min(34vh,15rem)] w-[min(44vw,11rem)] place-items-center rounded-[2rem] border border-dashed md:h-[min(62vh,34rem)] md:w-[min(52vw,17rem)] md:rounded-[3rem]"
              >
                <span className="text-label text-muted max-w-[12ch] px-4 text-center">
                  {t.hero.productPending}
                  <br />
                  {CONTENT_PENDING}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
