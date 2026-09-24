'use client';

import { type ElementType, type ReactNode, createElement, useEffect, useRef } from 'react';
import { STAGGERS } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export type SplitType = 'chars' | 'words' | 'lines';

export interface TextRevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string | undefined;
  id?: string | undefined;
  /** Nimaga bo'linsin. `lines` oyna kengligi o'zgarganda qayta hisoblanadi. */
  type?: SplitType;
  stagger?: number | undefined;
  delay?: number | undefined;
  /** Skrollga bog'lanmasin — hero kabi darhol ishga tushadigan joylar uchun. */
  immediate?: boolean;
}

/**
 * Matn bo'laklari maskadan KO'TARILIB chiqadi (faqat `opacity` emas).
 *
 * ENG MUHIM QOIDA: matn STANDART holatda KO'RINADI. Yashirish faqat
 * JavaScript ichida, animatsiya boshlanishi oldidan qo'yiladi — skript
 * yuklanmasa yoki qurilma kuchsiz bo'lsa, matn shunchaki joyida turadi.
 *
 * QULAYLIK: `lines` va `words` da hech narsa qilinmaydi — ekran
 * o'quvchi qator va so'zlarni tabiiy o'qiydi.
 *
 * `chars` esa harf-harf o'qilardi, shuning uchun u yerda bo'laklar
 * `aria-hidden` bo'ladi va yoniga faqat ekran o'quvchi uchun to'liq
 * matn nusxasi qo'yiladi.
 *
 * DIQQAT: konteynerga `aria-label` QO'YILMAYDI. `<span>` kabi rolsiz
 * elementda u ARIA qoidasi bo'yicha taqiqlangan va axe uni haqli
 * ravishda rad etadi (o'lchab aniqlangan).
 *
 * `2026-08-26` qurilishidan tiklandi (`components/animation/SplitText.tsx`
 * va `TextReveal.tsx` bitta komponentga birlashtirildi — ular faqat
 * birga ishlatilardi).
 */
export function TextReveal({
  children,
  as: Component = 'span',
  className,
  id,
  type = 'lines',
  stagger = STAGGERS.text,
  delay,
  immediate = false,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const root = ref.current;
    if (!enabled || root === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      // GSAP og'ir — u kontentni ko'rsatish uchun KERAK emas (CLAUDE.md §17).
      const { gsap, SplitText } = await import('./recipes');
      const { revealText } = await import('./recipes');
      if (cancelled) return;

      const label = root.textContent ?? '';
      root.dataset['reveal'] = 'on';
      let screenReaderCopy: HTMLElement | undefined;

      const context = gsap.context(() => {
        const split = new SplitText(root, {
          type,
          mask: type,
          // Oyna kengligi o'zgarganda qatorlar qayta hisoblanadi.
          autoSplit: type === 'lines',
          onSplit: (self) => {
            const pieces = self[type] as HTMLElement[];

            if (type === 'chars') {
              for (const piece of pieces) piece.setAttribute('aria-hidden', 'true');

              if (screenReaderCopy === undefined) {
                screenReaderCopy = document.createElement('span');
                screenReaderCopy.className = 'sr-only';
                screenReaderCopy.textContent = label;
                root.append(screenReaderCopy);
              }
            }

            return revealText(pieces, {
              ...(immediate ? {} : { trigger: root }),
              stagger,
              ...(delay === undefined ? {} : { delay }),
            });
          },
        });

        return () => split.revert();
      }, root);

      cleanup = () => {
        context.revert();
        screenReaderCopy?.remove();
        delete root.dataset['reveal'];
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, type, stagger, delay, immediate]);

  /*
    `createElement` ATAYLAB, JSX emas: polimorf `ElementType` uchun
    xossalar kesishmasi ba'zi global JSX kengaytmalari bilan `never`
    bo'lib qoladi (S17 da o'lchab aniqlangan).
  */
  return createElement(Component, { ref, id, className }, children);
}
