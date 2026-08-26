'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap } from '@/lib/gsap';
import { EASE, MARQUEE } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  /** Bir nusxaning to'liq o'tish vaqti (s). Kattaroq = sekinroq. */
  duration?: number;
  /** Teskari yo'nalish (o'ngdan chapga o'rniga chapdan o'ngga). */
  reverse?: boolean;
}

/**
 * Cheksiz kinetik lenta.
 *
 * Kontent ikki marta render qilinadi va birinchi nusxa `-100%` ga surilib
 * qaytadan boshlanadi — uzilish ko'rinmaydi.
 *
 * Hover'da lenta TO'XTAMAYDI, faqat sekinlashadi (`timeScale`) — spec talabi.
 */
export function Marquee({ children, className, duration = MARQUEE.duration, reverse = false }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const context = gsap.context(() => {
      const tween = gsap.to('[data-marquee-copy]', {
        xPercent: reverse ? 100 : -100,
        duration,
        ease: 'none',
        repeat: -1,
      });

      const setSpeed = (value: number) =>
        gsap.to(tween, { timeScale: value, duration: MARQUEE.tweenDuration, ease: EASE.out2 });

      const onEnter = () => setSpeed(MARQUEE.hoverTimeScale);
      const onLeave = () => setSpeed(1);

      root.addEventListener('mouseenter', onEnter);
      root.addEventListener('mouseleave', onLeave);

      return () => {
        root.removeEventListener('mouseenter', onEnter);
        root.removeEventListener('mouseleave', onLeave);
      };
    }, root);

    return () => context.revert();
  }, [duration, reverse, prefersReducedMotion]);

  return (
    <div ref={rootRef} className={cn('overflow-hidden', className)} aria-hidden="true">
      <div className={cn('flex w-max flex-nowrap', reverse && '-translate-x-full')}>
        <div data-marquee-copy className="flex flex-nowrap">
          {children}
        </div>
        <div data-marquee-copy className="flex flex-nowrap">
          {children}
        </div>
      </div>
    </div>
  );
}
