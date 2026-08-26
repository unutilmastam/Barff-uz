'use client';

import { useEffect } from 'react';

/**
 * Overlay ochilganda sahifa scroll'ini bloklaydi.
 *
 * Scrollbar kengligi `padding-right` bilan qoplanadi — layout shift bo'lmaydi.
 * Bir vaqtning o'zida bir nechta overlay bo'lsa hisoblagich ishlaydi
 * (MobileMenu ustidan Modal ochilsa, bittasi yopilganda blok yechilib qolmaydi).
 */
let lockCount = 0;
let restore: (() => void) | null = null;

export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      const { body } = document;
      const previousOverflow = body.style.overflow;
      const previousPadding = body.style.paddingRight;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = 'hidden';
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

      restore = () => {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
      };
    }

    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0 && restore) {
        restore();
        restore = null;
      }
    };
  }, [locked]);
}
