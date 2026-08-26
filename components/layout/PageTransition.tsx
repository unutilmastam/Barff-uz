'use client';

import { gsap } from 'gsap';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DURATION, EASE } from '@/lib/motion';

/**
 * Sahifalar orasidagi o'tish: brend rangli overlay pastdan yopadi, keyin tepaga chiqib ketadi.
 *
 * Kontentning o'zi animatsiya qilinmaydi — App Router'da eski sahifa darhol almashadi,
 * shuning uchun overlay yagona ishonchli usul. To'liq davomiyligi ~700ms (500–900ms oralig'ida).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    // Birinchi yuklashda Loader ishlaydi — overlay takrorlanmaydi.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      gsap
        .timeline()
        .set(overlayRef.current, { yPercent: 100, opacity: 1 })
        .to(overlayRef.current, {
          yPercent: 0,
          duration: DURATION.ui * 0.6,
          ease: EASE.out4,
        })
        .to(overlayRef.current, {
          yPercent: -100,
          duration: DURATION.ui * 0.7,
          ease: EASE.expo,
        })
        .set(overlayRef.current, { opacity: 0 });
    }, overlayRef);

    return () => context.revert();
  }, [pathname, prefersReducedMotion]);

  return (
    <>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="bg-primary pointer-events-none fixed inset-0 z-[150] opacity-0"
      />
      {children}
    </>
  );
}
