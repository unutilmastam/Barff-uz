'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { MAGNETIC } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export interface MagneticProps {
  children: ReactNode;
  className?: string | undefined;
  /** Maksimal siljish (px). */
  strength?: number;
}

/**
 * Sichqonchaga tortiladigan o'ram; kursor chiqib ketganda spring bilan
 * joyiga qaytadi.
 *
 * O'RAM, tugma EMAS: sayt CTA'lari havola (`<a>`), tugma esa emas.
 * Alohida "magnit tugma" komponenti `Button` ni takrorlashga majbur
 * qilardi — o'ram esa istalgan elementga qo'llanadi va uning
 * semantikasiga tegmaydi.
 *
 * FAQAT sichqonchali qurilmalarda: teginishli ekranda effekt ma'nosiz
 * va elementni barmoq ostidan siljitib yuborardi, shuning uchun
 * hodisalar u yerda UMUMAN ulanmaydi. Element harakatsiz ham to'liq
 * ishlaydi — effekt bezak.
 */
export function Magnetic({ children, className, strength = MAGNETIC.strength }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const element = ref.current;
    if (!enabled || element === null) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap, magnetic } = await import('./recipes');
      if (cancelled) return;

      let detach: (() => void) | undefined;
      const context = gsap.context(() => {
        detach = magnetic(element, { strength });
      }, element);

      cleanup = () => {
        detach?.();
        context.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, strength]);

  return (
    <span ref={ref} className={`inline-block ${className ?? ''}`}>
      {children}
    </span>
  );
}
