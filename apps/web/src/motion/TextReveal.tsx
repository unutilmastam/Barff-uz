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
 * QULAYLIK: bo'lingan matnni ekran o'quvchi harf-harf o'qimasligi uchun
 * konteynerga `aria-label` qo'yiladi va bo'laklar `aria-hidden` bo'ladi.
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
      root.setAttribute('aria-label', label);
      root.dataset['reveal'] = 'on';

      const context = gsap.context(() => {
        const split = new SplitText(root, {
          type,
          mask: type,
          // Oyna kengligi o'zgarganda qatorlar qayta hisoblanadi.
          autoSplit: type === 'lines',
          onSplit: (self) => {
            const pieces = self[type] as HTMLElement[];
            for (const piece of pieces) piece.setAttribute('aria-hidden', 'true');

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
        root.removeAttribute('aria-label');
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
