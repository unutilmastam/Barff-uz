'use client';

import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  createElement,
  useEffect,
  useRef,
} from 'react';
import { DURATION, EASE, REVEAL_DISTANCE, REVEAL_START, STAGGER } from './config';
import { useMotionEnabled } from './useMotionEnabled';

/**
 * Bo'lim ochilishi (scroll reveal).
 *
 * ENG MUHIM QOIDA: kontent STANDART holatda KO'RINADI.
 *
 * Boshlang'ich `opacity: 0` ni CSS ga yozish keng tarqalgan xato:
 * JavaScript yuklanmasa yoki xato bersa, matn MANGU ko'rinmay qoladi.
 * Shuning uchun yashirish FAQAT JavaScript ichida, animatsiya boshlanishi
 * oldidan qo'yiladi — ya'ni yashirish imkoniyati bor bo'lsa, uni ochish
 * imkoniyati ham bor.
 *
 * Xuddi shu sabab bilan `prefers-reduced-motion` yoki kuchsiz qurilmada
 * hech narsa qilinmaydi: kontent shunchaki joyida turadi.
 *
 * Kontent MAKONI o'zgarmaydi — faqat `opacity` va `transform`
 * animatsiya qilinadi, ya'ni sahifa sakramaydi (CLS = 0).
 */
export interface RevealProps extends Omit<ComponentPropsWithoutRef<'div'>, 'ref'> {
  children: ReactNode;
  as?: ElementType;
  /** `true` bo'lsa bolalar ketma-ket ochiladi. */
  stagger?: boolean;
}

export function Reveal({ children, as: Component = 'div', stagger = false, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const element = ref.current;
    if (!enabled || element === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // GSAP dinamik yuklanadi: u kontentni ko'rsatish uchun KERAK emas,
    // shuning uchun asosiy bundle'ni og'irlashtirmasligi kerak
    // (CLAUDE.md §17).
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      /*
        Animatsiya ROSTDAN ishga tushganini belgilaydi.

        Bu faqat nosozlikni topish uchun emas: tekshiruv skripti
        "harakat yoqilganmi" degan savolga chunk nomidan emas, DOM
        holatidan javob oladi — Next dinamik importni hash'langan
        faylga joylaydi va uning nomida `gsap` so'zi bo'lmaydi.
      */
      element.dataset['reveal'] = 'on';

      const targets = stagger ? Array.from(element.children) : [element];
      if (targets.length === 0) return;

      const tween = gsap.from(targets, {
        opacity: 0,
        y: REVEAL_DISTANCE,
        duration: DURATION.slow,
        ease: EASE,
        ...(stagger ? { stagger: STAGGER } : {}),
        scrollTrigger: {
          trigger: element,
          start: REVEAL_START,
          // Bir marta ochiladi: har skrollda qayta o'ynash chalg'itadi.
          once: true,
        },
      });

      cleanup = () => {
        delete element.dataset['reveal'];
        tween.scrollTrigger?.kill();
        tween.kill();
        // Animatsiya to'xtatilganda kontent KO'RINADIGAN holatda qoladi.
        gsap.set(targets, { clearProps: 'opacity,transform' });
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, stagger]);

  /*
    `createElement` ATAYLAB ishlatilgan, JSX emas.

    `@react-three/fiber` global `JSX.IntrinsicElements` ni yuzlab uch
    o'lchamli element bilan kengaytiradi; shundan keyin polimorf
    `ElementType` uchun xossalar kesishmasi `never` bo'lib qoladi.
    `createElement` bu hisobni chetlab o'tadi.
  */
  return createElement(Component, { ref, ...rest }, children);
}
