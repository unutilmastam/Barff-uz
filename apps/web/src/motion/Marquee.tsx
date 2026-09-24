'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { MARQUEE } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export interface MarqueeProps {
  children: ReactNode;
  className?: string | undefined;
  /** Bir nusxaning to'liq o'tish vaqti (s). Kattaroq = sekinroq. */
  duration?: number;
  /** Teskari yo'nalish. */
  reverse?: boolean;
}

/**
 * Cheksiz kinetik lenta — 2026-08-26 qurilishidan tiklandi.
 *
 * Kontent IKKI marta chiziladi va birinchi nusxa `-100%` ga surilib
 * qaytadan boshlanadi — uzilish ko'rinmaydi.
 *
 * Hover'da lenta TO'XTAMAYDI, faqat sekinlashadi (`timeScale`): to'liq
 * to'xtash harakatni "sinib qolgandek" ko'rsatadi.
 *
 * QULAYLIK: lenta butunlay BEZAK va `aria-hidden`. Undagi matn boshqa
 * joyda ham bo'lishi kerak — aks holda ekran o'quvchi foydalanuvchi uni
 * umuman eshitmaydi. Harakat o'chiq bo'lsa lenta joyida qotib turadi va
 * hech narsa buzilmaydi.
 */
export function Marquee({
  children,
  className,
  duration = MARQUEE.duration,
  reverse = false,
}: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const root = ref.current;
    if (!enabled || root === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap } = await import('./recipes');
      if (cancelled) return;

      const context = gsap.context(() => {
        const tween = gsap.to('[data-marquee-copy]', {
          xPercent: reverse ? 100 : -100,
          duration,
          ease: 'none',
          repeat: -1,
        });

        const setSpeed = (value: number) =>
          gsap.to(tween, { timeScale: value, duration: MARQUEE.tweenDuration, ease: 'power2.out' });

        const onEnter = () => setSpeed(MARQUEE.hoverTimeScale);
        const onLeave = () => setSpeed(1);

        root.addEventListener('mouseenter', onEnter);
        root.addEventListener('mouseleave', onLeave);

        return () => {
          root.removeEventListener('mouseenter', onEnter);
          root.removeEventListener('mouseleave', onLeave);
        };
      }, root);

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, duration, reverse]);

  return (
    <div ref={ref} aria-hidden="true" className={`overflow-hidden ${className ?? ''}`}>
      <div className={`flex w-max flex-nowrap ${reverse ? '-translate-x-full' : ''}`}>
        <div data-marquee-copy className="flex flex-nowrap">
          {children}
        </div>
        <div data-marquee-copy className="flex flex-nowrap">
          {children}
        </div>
      </div>
    </div>
  );
}
