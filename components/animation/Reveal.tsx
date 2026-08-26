'use client';

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fadeUp } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { STAGGER } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  /** Qaysi teg sifatida render qilinsin (`div`, `section`, `li` …). */
  as?: ElementType;
  className?: string;
  /** Bevosita farzandlarni ketma-ket chiqarish. */
  stagger?: number;
  distance?: number;
  delay?: number;
}

/**
 * Scroll'da pastdan suzib chiquvchi konteyner.
 * Bir nechta farzand bo'lsa ular `stagger` bilan ketma-ket chiqadi.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className,
  stagger = STAGGER.cards,
  distance,
  delay,
}: RevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      const targets = root.children.length > 1 ? Array.from(root.children) : root;
      fadeUp(targets, {
        reduced: prefersReducedMotion,
        trigger: root,
        stagger,
        distance,
        delay,
      });
    }, root);

    return () => context.revert();
  }, [prefersReducedMotion, stagger, distance, delay]);

  return (
    <Tag ref={rootRef} className={className}>
      {children}
    </Tag>
  );
}
