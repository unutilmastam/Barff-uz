'use client';

import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { LENIS } from '@/lib/motion';
import { smoothScroll } from '@/lib/smooth-scroll';

/**
 * Lenis + GSAP ticker + ScrollTrigger sinxronizatsiyasi.
 *
 * DOUBLE-SCROLL BUG'NING OLDINI OLISH — uchta shart birga bajarilishi shart:
 *
 * 1. Lenis o'zining `requestAnimationFrame` tsiklini YURITMAYDI (`autoRaf: false`).
 *    Uni faqat `gsap.ticker` yuritadi — shunda GSAP va Lenis bitta kadrda, bitta
 *    tartibda yangilanadi. Ikkita mustaqil rAF tsikli bo'lsa scroll ikki marta
 *    hisoblanadi va "sakrash" paydo bo'ladi.
 * 2. `ScrollTrigger.update` Lenis'ning `scroll` hodisasiga ulanadi — ScrollTrigger
 *    o'zining scroll listener'iga tayanib qolmaydi va kechikmaydi.
 * 3. `gsap.ticker.lagSmoothing(0)` — kadr kechikkanda GSAP vaqtni "tekislab"
 *    yubormaydi, aks holda Lenis pozitsiyasi bilan ScrollTrigger pozitsiyasi ajralib qoladi.
 *
 * `prefers-reduced-motion` yoqilgan bo'lsa Lenis umuman ishga tushmaydi — native scroll qoladi.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      smoothScroll.set(null);
      return;
    }

    const lenis = new Lenis({
      lerp: LENIS.lerp,
      wheelMultiplier: LENIS.wheelMultiplier,
      touchMultiplier: LENIS.touchMultiplier,
      syncTouch: LENIS.syncTouch,
      autoRaf: false,
    });

    smoothScroll.set(lenis);

    // (2) Har Lenis scroll'ida ScrollTrigger darhol yangilanadi.
    lenis.on('scroll', ScrollTrigger.update);

    // (1) Yagona rAF manbai — gsap.ticker. Lenis millisekund kutadi, ticker sekund beradi.
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);

    // (3) Vaqtni tekislash o'chiriladi.
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(onTick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      smoothScroll.set(null);
    };
  }, [prefersReducedMotion]);

  return children;
}
