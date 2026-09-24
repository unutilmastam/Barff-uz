'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { HERO_FRUIT, HERO_PRODUCT, HERO_TIMELINE } from './config';
import { useMotionEnabled } from './useMotionEnabled';

/**
 * Hero kompozitsiyasi — shisha va uning atrofida suzuvchi mevalar.
 *
 * 2026-08-26 qurilishidan tiklandi (`components/hero/HeroProduct.tsx`
 * va `FloatingFruit.tsx`). WebGL YO'Q: bu tekis illyustratsiya.
 *
 * Uch qatlam, har biri ALOHIDA elementda — bir-birining `transform`
 * ini bosmaydi:
 *   1. kirish  — `scale 0.65 → 1`, `rotate -8° → 0`
 *   2. suzish  — uzluksiz, `yoyo`
 *   3. egilish — kursorga reaksiya, faqat sichqonchali qurilmada
 *
 * MUHIM FARQ: tiklangan qurilishda markupda `opacity-0` yozilgandi va
 * JavaScript ishlamasa hero MANGU ko'rinmay qolardi. Bu yerda
 * kompozitsiya STANDART holatda ko'rinadi — yashirish faqat animatsiya
 * boshlanishi oldidan, JS ichida qo'yiladi (CLAUDE.md §17).
 */

/** Bezak mevalar. Joylashuv konteynerga nisbatan foizda. */
const FRUITS = [
  { src: '/fruits/placeholder-citrus-orange.svg', x: 8, y: 18, scale: 0.9, speed: 1, mobile: true },
  { src: '/fruits/placeholder-leaf.svg', x: 78, y: 62, scale: 0.7, speed: 1.3, mobile: true },
  { src: '/fruits/placeholder-peach.svg', x: 86, y: 14, scale: 0.6, speed: 0.8, mobile: false },
  { src: '/fruits/placeholder-berries.svg', x: 18, y: 74, scale: 0.55, speed: 1.1, mobile: false },
  {
    src: '/fruits/placeholder-citrus-lime.svg',
    x: 62,
    y: 86,
    scale: 0.5,
    speed: 0.9,
    mobile: false,
  },
] as const;

export interface HeroCompositionProps {
  /** Shisha rasmi. Berilmasa o'rindosh ramka chiziladi. */
  bottleSrc?: string;
  /** Shisha uchun matn — u BEZAK emas, sahifaning asosiy vizual fokusi. */
  bottleAlt: string;
}

export function HeroComposition({
  bottleSrc = '/products/placeholder-bottle-01.svg',
  bottleAlt,
}: HeroCompositionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const root = ref.current;
    if (!enabled || root === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap } = await import('./recipes');
      if (cancelled) return;

      root.dataset['hero'] = 'on';

      const context = gsap.context(() => {
        // 1. Shisha kirishi.
        gsap.fromTo(
          '[data-hero-bottle-enter]',
          { scale: HERO_PRODUCT.fromScale, rotate: HERO_PRODUCT.fromRotation, opacity: 0 },
          {
            scale: HERO_PRODUCT.toScale,
            rotate: HERO_PRODUCT.toRotation,
            opacity: 1,
            duration: 1.5,
            ease: 'expo.out',
            delay: HERO_TIMELINE.product,
          },
        );

        // 2. Uzluksiz suzish.
        gsap.to('[data-hero-bottle-float]', {
          y: -HERO_PRODUCT.floatDistance,
          rotate: HERO_PRODUCT.floatRotation,
          duration: HERO_PRODUCT.floatDuration,
          ease: 'power3.inOut',
          repeat: -1,
          yoyo: true,
          delay: HERO_TIMELINE.float,
        });

        // 3. Mevalar — har biri o'z tezligida, bir vaqtda ko'tarilmaydi.
        for (const fruit of root.querySelectorAll<HTMLElement>('[data-hero-fruit]')) {
          /*
            Yashirin tarmoqdagi (mobil/desktop) mevalar o'tkazib
            yuboriladi: ular ko'rinmaydi, lekin har kadrda
            hisoblanardi — mobilda bu bekorga sarflangan ish.
          */
          if (fruit.offsetParent === null) continue;

          const speed = Number(fruit.dataset['speed'] ?? 1);
          const index = Number(fruit.dataset['index'] ?? 0);
          const delay = HERO_TIMELINE.fruit + index * 0.08;

          gsap.fromTo(
            fruit,
            { opacity: 0, scale: 0.7 },
            { opacity: 1, scale: 1, duration: 1, ease: 'power4.out', delay },
          );

          gsap.to(fruit.firstElementChild, {
            y: -HERO_FRUIT.floatDistance * speed,
            rotate: 6 * speed,
            duration: gsap.utils.clamp(
              HERO_FRUIT.floatDurationMin,
              HERO_FRUIT.floatDurationMax,
              HERO_FRUIT.floatDurationMax / speed,
            ),
            ease: 'power3.inOut',
            repeat: -1,
            yoyo: true,
            delay: HERO_TIMELINE.float + index * 0.08,
          });
        }

        // 4. Kursorga reaksiya — faqat sichqonchali qurilmada.
        const media = gsap.matchMedia();
        media.add('(hover: hover) and (pointer: fine)', () => {
          const tilt = root.querySelector<HTMLElement>('[data-hero-bottle-tilt]');
          if (tilt === null) return undefined;

          const rotateY = gsap.quickTo(tilt, 'rotationY', {
            duration: HERO_PRODUCT.tiltSmoothing,
            ease: 'power3.out',
          });
          const rotateX = gsap.quickTo(tilt, 'rotationX', {
            duration: HERO_PRODUCT.tiltSmoothing,
            ease: 'power3.out',
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

      cleanup = () => {
        delete root.dataset['hero'];
        context.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      {/* BEZAK — shishadan ORQADA va hech qachon uni bosmaydi. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {FRUITS.map((fruit, index) => (
          <div
            key={fruit.src}
            data-hero-fruit
            data-speed={fruit.speed}
            data-index={index}
            className={`absolute ${fruit.mobile ? '' : 'hidden md:block'}`}
            style={{
              left: `${fruit.x}%`,
              top: `${fruit.y}%`,
              transform: `scale(${fruit.scale})`,
            }}
          >
            <Image
              src={fruit.src}
              alt=""
              width={320}
              height={320}
              sizes="(max-width: 768px) 24vw, 12vw"
              className="h-auto w-[min(24vw,7rem)] object-contain select-none"
            />
          </div>
        ))}
      </div>

      <div data-hero-bottle-enter>
        <div data-hero-bottle-float>
          <div data-hero-bottle-tilt className="[perspective:1200px] [transform-style:preserve-3d]">
            <Image
              src={bottleSrc}
              alt={bottleAlt}
              width={400}
              height={720}
              priority
              sizes="(max-width: 768px) 60vw, 30vw"
              /*
                Desktopda o'lcham BALANDLIK bo'yicha cheklanadi:
                kenglik bo'yicha berilsa, 400:720 nisbati hero'ni
                ekran balandligidan oshirib yuboradi.
              */
              className="h-auto w-[min(52vw,13rem)] object-contain md:h-[min(58vh,28rem)] md:w-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
