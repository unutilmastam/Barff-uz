'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { heroProduct } from '@/data/hero';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { EASE } from '@/lib/motion';

const FRUIT = { src: '/fruits/placeholder-citrus-orange.svg', width: 320, height: 320 };

/**
 * FRUIT → BOTTLE — brendning imzo o'tishi (bosh sahifa tartibida 08).
 *
 * Bo'lim pin qilinadi va scroll bo'ylab meva shishaga "aylanadi":
 *   - meva kichrayadi, biroz buriladi va so'nadi;
 *   - orqadagi rang dog'i mevaning rangidan mahsulot rangiga o'tadi va cho'ziladi;
 *   - shisha pastdan clip-path bilan "to'ladi" va o'lchamiga yetadi.
 *
 * Bu SOXTA 3D yoki morf emas (14-qoida): haqiqiy 3D model yo'q, shuning uchun
 * shaffof fonli rasm + GSAP transform ishlatiladi. Harakat scroll'ga bog'langan
 * (`scrub`), ya'ni foydalanuvchi tezligini o'zi boshqaradi.
 */
export function FruitToBottle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useLocale();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: EASE.inOut3 },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${window.innerHeight * 1.6}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // Vaqtlar QAT'IY belgilanadi va ustma-ust tushadi. Ikkala element bir vaqtda
      // so'nmasligi uchun so'nish/ochilish uchun `ease: none` ishlatiladi: `inOut`
      // egri chizig'i o'rtada tez o'zgargani sababli ular past nuqtada kesishib,
      // ekranda bo'shliq paydo qilardi.
      timeline
        // Meva shakli butun davomiylikda kichrayadi va buriladi — "aylanish" hissi.
        .fromTo(
          '[data-ftb-fruit]',
          { scale: 1, rotate: 0, y: 0 },
          { scale: 0.4, rotate: -30, y: -30, duration: 0.7, ease: EASE.inOut3 },
          0,
        )
        // So'nishi esa shisha allaqachon ochilib bo'lgandan keyin tugaydi.
        .fromTo(
          '[data-ftb-fruit]',
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: 0.4, ease: 'none' },
          0.28,
        )
        // Rang dog'i mevadan mahsulot rangiga o'tadi.
        .fromTo(
          '[data-ftb-blob]',
          { scale: 0.55, backgroundColor: '#F79A32' },
          { scale: 1.15, backgroundColor: '#F4761F', duration: 1, ease: EASE.inOut3 },
          0,
        )
        // Shisha erta paydo bo'ladi va pastdan TEZ to'ladi.
        .fromTo('[data-ftb-bottle]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, 0.12)
        .fromTo(
          '[data-ftb-bottle]',
          { clipPath: 'inset(100% 0% 0% 0%)', scale: 0.78 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.5, ease: EASE.out3 },
          0.12,
        )
        // Yozuvlar ham ustma-ust almashadi.
        .fromTo('[data-ftb-label-fruit]', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0.2)
        .fromTo('[data-ftb-label-bottle]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' }, 0.35);
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      context.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <section aria-labelledby="ftb-title" className="overflow-hidden">
      <h2 id="ftb-title" className="sr-only">
        {t.sections.fruitToBottle}
      </h2>

      {/* Pin ichki blokka — flex farzandida pin-spacer padding yig'ilmaydi. */}
      <div ref={rootRef} className="relative grid min-h-screen place-items-center">
        <div className="relative grid h-[min(70vh,34rem)] w-full place-items-center">
          <div
            data-ftb-blob
            aria-hidden="true"
            className="absolute aspect-square w-[min(52vw,18rem)] rounded-full opacity-40 blur-2xl"
          />

          <Image
            data-ftb-fruit
            src={FRUIT.src}
            alt=""
            aria-hidden="true"
            width={FRUIT.width}
            height={FRUIT.height}
            sizes="(max-width: 768px) 55vw, 22rem"
            className="absolute w-[min(55vw,20rem)] object-contain"
          />

          {heroProduct && (
            <Image
              data-ftb-bottle
              src={heroProduct.src}
              alt={heroProduct.alt}
              width={heroProduct.width ?? 400}
              height={heroProduct.height ?? 720}
              sizes="(max-width: 768px) 50vw, 20rem"
              className="absolute h-[min(62vh,30rem)] w-auto object-contain opacity-0"
            />
          )}
        </div>

        <div className="text-label text-muted absolute bottom-12 grid place-items-center">
          <span data-ftb-label-fruit className="col-start-1 row-start-1">
            {t.process.fruit}
          </span>
          <span data-ftb-label-bottle className="col-start-1 row-start-1 opacity-0">
            {t.process.bottle}
          </span>
        </div>
      </div>
    </section>
  );
}
