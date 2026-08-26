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

    // Element yashirin (display:none) yoki kontent ekranga sig'sa — pin keraksiz va
    // zararli: yashirin elementning `scrollWidth` i 0 bo'lib, bo'sh pin-spacer qoladi.
    if (track.offsetParent === null || track.scrollWidth <= window.innerWidth) return;

    const context = gsap.context(() => {
      horizontalScroll(section, track, { reduced: prefersReducedMotion });
    }, section);

    // Bu bo'lim pin qilinganda sahifa balandligi o'zgaradi. U hydration'dan keyin
    // (media query natijasiga qarab) mount bo'lishi mumkin — o'shanda BOSHQA
    // ScrollTrigger'larning boshlanish nuqtalari eskirib qoladi, shuning uchun
    // mount va unmount'da hammasi qayta o'lchanadi.
    ScrollTrigger.refresh();

    // Rasm/shrift yuklanib bo'lgach kengliklar yana o'zgaradi.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      context.revert();
      ScrollTrigger.refresh();
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
