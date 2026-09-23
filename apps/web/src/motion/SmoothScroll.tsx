'use client';

import { useEffect } from 'react';
import { useMotionEnabled } from './useMotionEnabled';

/**
 * Yumshoq skroll (Lenis).
 *
 * BU XUSUSIYAT EHTIYOTKORLIK BILAN YOQILADI. Skrollni qo'lga olish —
 * brauzerning eng asosiy xatti-harakatini almashtirish demak, va u
 * noto'g'ri bajarilsa saytni ishlatib bo'lmay qoladi. Shuning uchun u
 * quyidagi hollarda UMUMAN ishga tushmaydi:
 *
 *   - `prefers-reduced-motion` so'ralgan bo'lsa (vestibulyar buzilish);
 *   - qurilma kuchsiz bo'lsa;
 *   - ko'rsatkich "qo'pol" bo'lsa, ya'ni sensorli ekran — mobil
 *     brauzerlarning o'z skrolli allaqachon yumshoq va uni
 *     almashtirish faqat yomonlashtiradi.
 *
 * Shu sababli mobil foydalanuvchi va klaviatura foydalanuvchisi
 * BRAUZERNING O'Z skrollini oladi.
 */
export function SmoothScroll() {
  const enabled = useMotionEnabled();

  useEffect(() => {
    if (!enabled) return undefined;

    // Sensorli qurilmada native skroll qoldiriladi.
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;

    let cancelled = false;
    let stop: (() => void) | undefined;

    void (async () => {
      const { default: Lenis } = await import('lenis');
      if (cancelled) return;

      const lenis = new Lenis({
        duration: 1.1,
        // Yumshoq, lekin cho'zilmaydigan to'xtash.
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
      });

      let frame = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);

      stop = () => {
        cancelAnimationFrame(frame);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled]);

  return null;
}
