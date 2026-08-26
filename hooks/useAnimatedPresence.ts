'use client';

import { useCallback, useState } from 'react';

interface AnimatedPresence {
  /** DOM'da bo'lishi kerakmi (ochilganda darhol `true`, yopilish animatsiyasi tugagach `false`). */
  rendered: boolean;
  /** Yopilish animatsiyasi tugaganda chaqiriladi. */
  onExited: () => void;
}

/**
 * Overlay'ni yopilish animatsiyasi tugagunicha DOM'da ushlab turadi.
 *
 * Holat `useEffect` da emas, render paytida moslashtiriladi — React hujjatlaridagi
 * "prop o'zgarganda holatni moslashtirish" namunasi. Bu ortiqcha render zanjirini
 * oldini oladi va `isOpen` true bo'lishi bilan bir xil render'da DOM paydo bo'ladi.
 */
export function useAnimatedPresence(isOpen: boolean): AnimatedPresence {
  const [rendered, setRendered] = useState(isOpen);
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) setRendered(true);
  }

  const onExited = useCallback(() => setRendered(false), []);

  return { rendered, onExited };
}
