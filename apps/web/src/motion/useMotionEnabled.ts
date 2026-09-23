'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Harakat SHU qurilmada yoqilishi kerakmi.
 *
 * Uch shart tekshiriladi:
 *   1. `prefers-reduced-motion` — foydalanuvchi so'rovi eng ustun;
 *   2. qurilma quvvati — kuchsiz telefonda animatsiya sekinlashtiradi;
 *   3. hidratsiya tugagani — serverda `window` yo'q.
 *
 * Standart javob — YO'Q. Shunda animatsiya faqat u aniq mumkin
 * bo'lgandagina ishga tushadi, aksincha emas.
 */
export function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    /*
      Kuchsiz qurilma belgilari. `deviceMemory` va `hardwareConcurrency`
      hamma brauzerda yo'q — berilmagan bo'lsa, qurilma yetarli deb
      hisoblanadi, aks holda hamma Safari foydalanuvchisi animatsiyasiz
      qolardi.
    */
    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;

    const weak = (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2);

    setCapable(!weak);
  }, []);

  return capable && !reduced;
}
