'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { imageReveal } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface ImageRevealProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Hero rasmlari uchun — `next/image` ni birinchi navbatda yuklaydi. */
  priority?: boolean;
  sizes?: string;
}

/**
 * Rasm reveal: konteyner clip-path bilan pastdan ochiladi, rasm esa `1.15` dan `1` ga qaytadi.
 * Ikkalasi bir vaqtda ishlaydi — natijada "kamera ichkariga tortilgandek" his beradi.
 */
export function ImageReveal({ src, alt, width, height, className, priority, sizes }: ImageRevealProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const image = imageRef.current;
    if (!wrapper || !image) return;

    const context = gsap.context(() => {
      imageReveal(wrapper, image, { reduced: prefersReducedMotion, trigger: wrapper });
    }, wrapper);

    return () => context.revert();
  }, [prefersReducedMotion]);

  return (
    <div ref={wrapperRef} className={cn('overflow-hidden', className)}>
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
