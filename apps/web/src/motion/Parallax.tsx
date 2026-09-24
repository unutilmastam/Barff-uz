'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { PARALLAX } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export interface ParallaxProps {
  children: ReactNode;
  className?: string | undefined;
  /**
   * Siljish tezligi. Standart qiymatlar `config.ts` da: fon `0.1`,
   * rasm `0.25`, meva `0.45`. Katta qiymat = ko'proq siljiydi.
   */
  speed?: number;
}

/**
 * Skrollga bog'langan parallaks.
 *
 * `scrub: true` — element skroll bilan UZLUKSIZ bog'lanadi, sakramaydi.
 * Mobilda kuch avtomatik kamayadi (`PARALLAX.mobileFactor`): tor ekranda
 * katta siljish elementlarni bir-birining ustiga chiqarib yuboradi.
 */
export function Parallax({ children, className, speed = PARALLAX.image }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const root = ref.current;
    if (!enabled || root === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap, parallax } = await import('./recipes');
      if (cancelled) return;

      const context = gsap.context(() => {
        parallax(root, { speed });
      }, root);

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
