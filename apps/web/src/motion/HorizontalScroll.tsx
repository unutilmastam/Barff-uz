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
 * FAQAT DESKTOPDA yopishtiriladi. Telefonda va harakat o'chiq bo'lganda
 * lenta oddiy gorizontal skrollga aylanadi (`overflow-x: auto`) —
 * kontent hech qachon yetib bo'lmaydigan bo'lib qolmaydi
 * (CLAUDE.md §17: animatsiya kontentni tushunishning yagona yo'li
 * bo'lmasligi kerak).
 *
 * `overflow-x-auto` desktopda FAQAT animatsiya ishlaganda olib
 * tashlanadi (GSAP `x` ni boshqaradi). Harakat o'chiq bo'lsa lenta
 * desktopda ham oddiy skrollga ega bo'lib qoladi.
 *
 * Tashqi o'ram `overflow-x-clip` bilan kesadi: lenta ekrandan keng
 * (mahsulotlar ko'p) bo'lganda sahifaning O'ZI yon tomonga siljib
 * qolmasligi uchun. `clip` skroll konteyneri YARATMAYDI, shuning
 * uchun yopishtirish (pin) buzilmaydi.
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
    <div ref={sectionRef} className={`overflow-x-clip ${className ?? ''}`}>
      <div
        ref={trackRef}
        className={`overflow-x-auto ${enabled ? 'md:overflow-x-visible' : ''} ${trackClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}
