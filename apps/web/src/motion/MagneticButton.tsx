'use client';

import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react';
import { MAGNETIC } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export interface MagneticButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
  children: ReactNode;
  /** Maksimal siljish (px). */
  strength?: number;
}

/**
 * Sichqonchaga tortiladigan tugma; chiqib ketilganda spring bilan
 * joyiga qaytadi.
 *
 * FAQAT sichqonchali qurilmalarda: teginishli ekranda "magnit" effekti
 * ma'nosiz va tugmani barmoq ostidan siljitib yuborardi. Shuning uchun
 * hodisalar u yerda UMUMAN ulanmaydi.
 *
 * Tugmaning o'zi harakatsiz ham to'liq ishlaydi — effekt bezak.
 */
export function MagneticButton({
  children,
  strength = MAGNETIC.strength,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const button = ref.current;
    if (!enabled || button === null) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap, magnetic } = await import('./recipes');
      if (cancelled) return;

      let detach: (() => void) | undefined;
      const context = gsap.context(() => {
        detach = magnetic(button, { strength });
      }, button);

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
    <button ref={ref} type="button" {...rest}>
      {children}
    </button>
  );
}
