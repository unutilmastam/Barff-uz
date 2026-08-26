'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { parallax } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { PARALLAX } from '@/lib/motion';

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /**
   * Siljish tezligi. Standart qiymatlar `lib/motion.ts` da:
   * fon `0.1`, rasm `0.25`, meva `0.45`. Katta qiymat = ko'proq siljiydi.
   */
  speed?: number;
}

/**
 * Scroll'ga bog'langan parallaks.
 * `scrub: true` — element scroll bilan uzluksiz bog'lanadi, sakramaydi.
 */
export function Parallax({ children, className, speed = PARALLAX.image }: ParallaxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      parallax(root, { speed, reduced: prefersReducedMotion });
    }, root);

    return () => context.revert();
  }, [speed, prefersReducedMotion]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
