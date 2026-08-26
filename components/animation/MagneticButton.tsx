'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { magnetic } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { MAGNETIC_STRENGTH } from '@/lib/motion';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Maksimal siljish (px). Spec chegarasi: 8–15. */
  strength?: number;
  'aria-label'?: string;
}

/**
 * Sichqonchaga tortiladigan tugma; chiqib ketilganda spring bilan joyiga qaytadi.
 * Faqat sichqonchali qurilmalarda ishlaydi — touch'da hodisalar umuman ulanmaydi.
 */
export function MagneticButton({
  children,
  className,
  onClick,
  strength = MAGNETIC_STRENGTH,
  'aria-label': ariaLabel,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let cleanup: (() => void) | undefined;

    const context = gsap.context(() => {
      cleanup = magnetic(button, { strength, reduced: prefersReducedMotion });
    }, button);

    return () => {
      cleanup?.();
      context.revert();
    };
  }, [strength, prefersReducedMotion]);

  return (
    <button ref={buttonRef} type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  );
}
