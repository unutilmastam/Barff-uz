'use client';

import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DURATION, EASE } from '@/lib/motion';

/** Sessiyada loader ko'rsatilganini belgilash — takroriy kirishda qisqaroq bo'ladi. */
const SESSION_KEY = 'barff-loader-seen';

const FIRST_VISIT_DURATION = 1.4;
const REPEAT_VISIT_DURATION = 0.6;

/**
 * Kirish loader'i: `BARFF` + 0% → 100%.
 *
 * Server'da ham chiqadi (kontent ustida overlay) — shu sababli sahifa "yalt" etib
 * ochilib ketmaydi. Sessiyada ikkinchi marta ochilganda qisqaroq ishlaydi.
 */
export function Loader() {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useLocale();

  useLockBodyScroll(!done);

  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === '1';
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage yo'q bo'lsa — birinchi kirish deb hisoblanadi.
    }

    const duration = prefersReducedMotion
      ? 0.01
      : seen
        ? REPEAT_VISIT_DURATION
        : FIRST_VISIT_DURATION;

    const context = gsap.context(() => {
      const progress = { value: 0 };

      gsap
        .timeline({ onComplete: () => setDone(true) })
        .to(progress, {
          value: 100,
          duration,
          ease: EASE.out3,
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = `${Math.round(progress.value)}%`;
            }
          },
        })
        .to(rootRef.current, {
          yPercent: prefersReducedMotion ? 0 : -100,
          opacity: prefersReducedMotion ? 0 : 1,
          duration: prefersReducedMotion ? 0.01 : DURATION.ui,
          ease: EASE.expo,
        });
    }, rootRef);

    return () => context.revert();
  }, [prefersReducedMotion]);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label={t.loader.status}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background"
    >
      <span className="text-section select-none">BARFF</span>
      <span ref={counterRef} className="text-label text-muted tabular-nums">
        0%
      </span>
    </div>
  );
}
