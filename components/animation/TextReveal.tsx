'use client';

import { useCallback, type ElementType, type ReactNode } from 'react';
import { SplitText, type SplitType } from '@/components/animation/SplitText';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { revealText } from '@/lib/animations';
import { STAGGER } from '@/lib/motion';

interface TextRevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Qatorlar (sarlavhalar uchun), so'zlar yoki belgilar. */
  type?: SplitType;
  stagger?: number;
  delay?: number;
  /** Scroll'ga bog'lanmasin — Hero kabi darhol ishga tushadigan joylar uchun. */
  immediate?: boolean;
}

/**
 * Matn bo'laklari maskadan ko'tarilib chiqadi.
 * Animatsiya `SplitText` bo'laklarni tayyorlagach quriladi (`onSplit`).
 */
export function TextReveal({
  children,
  as,
  className,
  type = 'lines',
  stagger = STAGGER.text,
  delay,
  immediate = false,
}: TextRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleSplit = useCallback(
    (pieces: HTMLElement[], root: HTMLElement) => {
      // `immediate` bo'lsa scroll kutilmaydi — Hero kabi joylarda darhol ishlaydi.
      const trigger = immediate ? null : root;

      return revealText(pieces, {
        reduced: prefersReducedMotion,
        trigger,
        stagger,
        delay,
      });
    },
    [prefersReducedMotion, stagger, delay, immediate],
  );

  return (
    <SplitText
      as={as}
      className={className}
      type={type}
      onSplit={handleSplit}
    >
      {children}
    </SplitText>
  );
}
