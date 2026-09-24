'use client';

import { useEffect } from 'react';
import { LENIS } from './config';
import { useMotionEnabled } from './useMotionEnabled';

/**
 * Yumshoq skroll (Lenis) + GSAP ScrollTrigger sinxronizatsiyasi.
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
 *
 * ================== IKKI MARTA SKROLL MUAMMOSI ==================
 *
 * Skrollga bog'langan animatsiyalar (parallaks, gorizontal lenta)
 * qo'shilgach uchta shart BIRGA bajarilishi shart, aks holda skroll
 * ikki marta hisoblanadi va sahifa "sakraydi":
 *
 *   1. Lenis o'z `requestAnimationFrame` tsiklini YURITMAYDI
 *      (`autoRaf: false`) — uni faqat `gsap.ticker` yuritadi, shunda
 *      GSAP va Lenis bitta kadrda, bitta tartibda yangilanadi.
 *   2. `ScrollTrigger.update` Lenis'ning `scroll` hodisasiga ulanadi —
 *      ScrollTrigger o'z listener'iga tayanib kechikmaydi.
 *   3. `lagSmoothing(0)` — kadr kechikkanda GSAP vaqtni "tekislab"
 *      yubormaydi, aks holda Lenis va ScrollTrigger pozitsiyalari
 *      ajralib qoladi.
 *
 * Bu integratsiya 2026-08-26 qurilishidan tiklandi (git `a86f349`).
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
      /*
        `recipes` GSAP ni olib keladi. U allaqachon boshqa harakat
        komponentlari tomonidan yuklanadigan CHUNK, shuning uchun bu
        yerda qo'shimcha yuk yo'q — va GSAP dastlabki bundle'ga
        baribir tushmaydi.
      */
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('./recipes'),
      ]);
      if (cancelled) return;

      const lenis = new Lenis({
        lerp: LENIS.lerp,
        wheelMultiplier: LENIS.wheelMultiplier,
        touchMultiplier: LENIS.touchMultiplier,
        syncTouch: LENIS.syncTouch,
        autoRaf: false,
      });

      lenis.on('scroll', ScrollTrigger.update);

      // Lenis millisekund kutadi, ticker esa sekund beradi.
      const onTick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.refresh();

      stop = () => {
        gsap.ticker.remove(onTick);
        // GSAP ning standart qiymatlari qaytariladi.
        gsap.ticker.lagSmoothing(500, 33);
        lenis.off('scroll', ScrollTrigger.update);
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
