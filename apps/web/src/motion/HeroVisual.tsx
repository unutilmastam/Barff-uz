'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useMotionEnabled } from './useMotionEnabled';
import { hasWebGL } from './webgl';

/**
 * Bosh ekran bezagi: uch o'lchamli sahna YOKI uning zaxirasi.
 *
 * ASOSIY QOIDA (CLAUDE.md §26): foydalanuvchi ko'radigan kontent
 * sahnadan OLDIN chiziladi. Shuning uchun sahna:
 *   - `ssr: false` bilan yuklanadi — server HTML'ida u umuman yo'q;
 *   - faqat hidratsiyadan KEYIN, alohida so'rov bilan keladi;
 *   - sarlavha va tugmalar ortida, `absolute` qatlamda turadi.
 *
 * Sahna chizilmaydigan uch holat bor va uchalasida ham zaxira gradient
 * qoladi — ya'ni ekran hech qachon bo'sh ko'rinmaydi:
 *   1. `prefers-reduced-motion` so'ralgan;
 *   2. qurilma kuchsiz;
 *   3. WebGL mavjud emas (eski brauzer, o'chirilgan tezlashtirish).
 */
const HeroScene = dynamic(() => import('./HeroScene'), {
  // Serverda chizilmaydi: three.js HTML javobini og'irlashtirardi va
  // baribir brauzergacha hech narsa ko'rsatmasdi.
  ssr: false,
});

export function HeroVisual() {
  const motion = useMotionEnabled();
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    // Tekshiruv brauzerda, hidratsiyadan keyin bajariladi.
    setWebgl(hasWebGL());
  }, []);

  const show = motion && webgl;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        Zaxira qatlam HAR DOIM bor va sahna uning USTIGA chiziladi.
        Shu tufayli sahna yuklanayotganda ham, umuman yuklanmaganda ham
        ekran bir xil ko'rinadi — "bo'sh joydan sakrab paydo bo'lish"
        effekti yo'q.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_40%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" />

      {show && (
        <div className="absolute inset-0">
          <HeroScene />
        </div>
      )}
    </div>
  );
}
