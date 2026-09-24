'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useMotionEnabled } from './useMotionEnabled';

export interface ImageRevealProps {
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Rasm ochilishi: `clip-path` pastdan ochiladi va rasm bir vaqtda
 * `scale 1.15` dan `1` ga tushadi.
 *
 * Rasm va uni o'rab turgan element ALOHIDA animatsiya qilinadi —
 * shuning uchun bola element (`<img>`, `<picture>`) shu o'ram ichida
 * bo'lishi kerak. Harakat o'chiq bo'lsa rasm shunchaki joyida turadi.
 */
export function ImageReveal({ children, className }: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const wrapper = ref.current;
    if (!enabled || wrapper === null) return undefined;

    const image = wrapper.firstElementChild;
    if (image === null) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap, imageReveal } = await import('./recipes');
      if (cancelled) return;

      const context = gsap.context(() => {
        imageReveal(wrapper, image, { trigger: wrapper });
      }, wrapper);

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
