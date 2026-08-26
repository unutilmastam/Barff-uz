'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { horizontalScroll } from '@/lib/animations';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  /** Lenta uchun qo'shimcha classlar (masalan `gap-8`). */
  trackClassName?: string;
}

/**
 * Vertikal scroll'ni gorizontal harakatga aylantiradi: bo'lim pin qilinadi,
 * lenta esa yon tomonga suriladi.
 *
 * Masofa lenta kengligidan dinamik hisoblanadi (`scrollWidth - innerWidth`) va
 * `invalidateOnRefresh` tufayli oyna o'lchami yoki kontent o'zgarganda qayta o'lchanadi.
 *
 * `prefers-reduced-motion` yoqilgan bo'lsa pin ham, surish ham bo'lmaydi —
 * lenta oddiy gorizontal scroll bilan qo'lda suriladi.
 */
export function HorizontalScroll({ children, className, trackClassName }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const context = gsap.context(() => {
      horizontalScroll(section, track, { reduced: prefersReducedMotion });
    }, section);

    // Rasm/shrift yuklanib bo'lgach kengliklar o'zgaradi — o'lchovlar yangilanadi.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      context.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={sectionRef} className={cn('overflow-hidden', className)}>
      <div
        ref={trackRef}
        className={cn(
          'flex w-max flex-nowrap items-center',
          prefersReducedMotion && 'max-w-full overflow-x-auto',
          trackClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
