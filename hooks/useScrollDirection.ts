'use client';

import { useEffect, useState } from 'react';

export type ScrollDirection = 'up' | 'down';

export interface ScrollState {
  direction: ScrollDirection;
  /** Sahifa tepasidan `threshold` dan pastga tushganmi. */
  scrolled: boolean;
  /** Eng tepada turibdimi (Header shaffof qolishi uchun). */
  atTop: boolean;
}

interface Options {
  /** `scrolled` holatiga o'tish chegarasi (px). */
  threshold?: number;
  /** Shu qiymatdan kichik siljish yo'nalish deb hisoblanmaydi (titrashga qarshi). */
  tolerance?: number;
}

/**
 * Scroll yo'nalishi va holati.
 *
 * `rAF` bilan throttle qilinadi va `passive` listener ishlatiladi — scroll bloklanmaydi.
 * Phase 3 da Lenis ulangach ham shu hook ishlayveradi (Lenis native scroll'ni boshqaradi).
 */
export function useScrollDirection({ threshold = 24, tolerance = 6 }: Options = {}): ScrollState {
  const [state, setState] = useState<ScrollState>({
    direction: 'up',
    scrolled: false,
    atTop: true,
  });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = Math.max(window.scrollY, 0);
      const delta = y - lastY;

      setState((previous) => {
        const direction: ScrollDirection =
          Math.abs(delta) < tolerance ? previous.direction : delta > 0 ? 'down' : 'up';
        const scrolled = y > threshold;
        const atTop = y <= 2;

        if (
          direction === previous.direction &&
          scrolled === previous.scrolled &&
          atTop === previous.atTop
        ) {
          return previous;
        }
        return { direction, scrolled, atTop };
      });

      if (Math.abs(delta) >= tolerance) lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, tolerance]);

  return state;
}
