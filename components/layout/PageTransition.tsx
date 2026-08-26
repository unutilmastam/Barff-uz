'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { pageTransition } from '@/lib/animations';
import { gsap } from '@/lib/gsap';

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

    const overlay = overlayRef.current;
    if (!overlay) return;

    const context = gsap.context(() => {
      pageTransition(overlay, { reduced: prefersReducedMotion });
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
