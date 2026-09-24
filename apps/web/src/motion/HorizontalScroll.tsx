'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useMotionEnabled } from './useMotionEnabled';

export interface HorizontalScrollProps {
  children: ReactNode;
  className?: string | undefined;
  trackClassName?: string | undefined;
}

/**
 * Gorizontal skroll: bo'lim ekranga "yopishtiriladi" va ichidagi lenta
 * yon tomonga suriladi.
 *
 * HARAKAT O'CHIQ BO'LSA lenta oddiy gorizontal skrollga aylanadi
 * (`overflow-x: auto`) — kontent hech qachon yetib bo'lmaydigan bo'lib
 * qolmaydi (CLAUDE.md §17: animatsiya kontentni tushunishning yagona
 * yo'li bo'lmasligi kerak).
 */
export function HorizontalScroll({ children, className, trackClassName }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!enabled || section === null || track === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap, horizontalScroll } = await import('./recipes');
      if (cancelled) return;

      const context = gsap.context(() => {
        horizontalScroll(section, track);
      }, section);

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);

  return (
    <div ref={sectionRef} className={className}>
      <div
        ref={trackRef}
        // Harakat yoqilganda GSAP `x` ni boshqaradi va skroll kerak
        // emas; o'chiq bo'lsa brauzerning o'z skrolli qoladi.
        className={enabled ? trackClassName : `overflow-x-auto ${trackClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}
