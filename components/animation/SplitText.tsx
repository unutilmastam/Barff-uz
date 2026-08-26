'use client';

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { SplitText as GsapSplitText, gsap } from '@/lib/gsap';

export type SplitType = 'chars' | 'words' | 'lines';

interface SplitTextProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Nimaga bo'linsin. `lines` oyna kengligi o'zgarganda qayta hisoblanadi. */
  type?: SplitType;
  /**
   * Bo'laklar tayyor bo'lgach chaqiriladi — animatsiya shu yerda quriladi.
   * `root` — ScrollTrigger biriktirish uchun konteyner elementi.
   */
  onSplit?: (pieces: HTMLElement[], root: HTMLElement) => void;
}

/**
 * Matnni belgi / so'z / qatorlarga ajratadi.
 *
 * Har bo'lak `overflow: hidden` maskasi ichiga o'raladi (`revealText()` pastdan
 * ko'tarilishi uchun). Ekran o'quvchilar bo'lingan matnni harf-harf o'qimasligi uchun
 * konteynerga `aria-label` qo'yiladi va bo'laklar `aria-hidden` bo'ladi.
 *
 * Ajratish `gsap.context()` ichida — `revert()` da asl matn tiklanadi.
 */
export function SplitText({ children, as: Tag = 'span', className, type = 'lines', onSplit }: SplitTextProps) {
  const rootRef = useRef<HTMLElement>(null);

  // `onSplit` chaqiruvchi tomonda `useCallback` bilan barqarorlashtirilgan bo'lishi kutiladi —
  // shunda matn har render'da qayta bo'linmaydi.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.setAttribute('aria-label', root.textContent ?? '');

    const context = gsap.context(() => {
      const split = new GsapSplitText(root, {
        type,
        mask: type,
        // Oyna kengligi o'zgarganda qatorlar qayta hisoblanadi.
        autoSplit: type === 'lines',
        onSplit: (self) => {
          const pieces = self[type] as HTMLElement[];
          pieces.forEach((piece) => piece.setAttribute('aria-hidden', 'true'));
          return onSplit?.(pieces, root);
        },
      });

      return () => split.revert();
    }, root);

    return () => {
      context.revert();
      root.removeAttribute('aria-label');
    };
  }, [type, onSplit]);

  return (
    <Tag ref={rootRef} className={className}>
      {children}
    </Tag>
  );
}
