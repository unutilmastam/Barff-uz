'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** Server'da har doim `false` — hydration mos keladi. */
const getServerSnapshot = () => false;

/**
 * Foydalanuvchi kamaytirilgan animatsiyani so'raganini qaytaradi.
 * Sozlama sessiya davomida o'zgarsa ham komponentlar qayta render bo'ladi.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
