'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Komponent brauzerda ishlayaptimi.
 *
 * `useEffect` + `setState` o'rniga `useSyncExternalStore` ishlatiladi:
 * server `false`, hydration'dan keyin `true` — ortiqcha render zanjiri yo'q.
 * Portal (`createPortal`) uchun kerak.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
