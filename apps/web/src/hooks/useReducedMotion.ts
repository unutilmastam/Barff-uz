'use client';

import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Foydalanuvchi harakatni kamaytirishni so'raganmi (CLAUDE.md §17).
 *
 * `useState` + `useEffect` o'rniga `useSyncExternalStore`: u brauzer
 * sozlamasini TASHQI manba deb qaraydi, shuning uchun birinchi renderda
 * ham to'g'ri qiymat beradi va sozlama o'zgarganda qayta render bo'ladi.
 * `useEffect` bilan birinchi render har doim "harakat yoqilgan" holatda
 * chiqib, keyin sakrab o'zgarardi.
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // Serverda `window` yo'q. Eng xavfsiz taxmin — harakatni KAMAYTIRISH:
    // shunda hidratsiyagacha hech qanday animatsiya boshlanmaydi.
    () => true,
  );
}
