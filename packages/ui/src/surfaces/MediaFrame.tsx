import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type MediaRatio = 'square' | 'portrait' | 'landscape' | 'wide';

const RATIOS: Record<MediaRatio, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
};

export interface MediaFrameProps {
  children: ReactNode;
  ratio?: MediaRatio;
  caption?: string;
  className?: string;
}

/**
 * Rasm/video uchun ramka.
 *
 * Nisbat OLDINDAN belgilanadi, shuning uchun rasm yuklanguncha ham joy
 * band bo'ladi va sahifa sakramaydi (CLS). Bu Core Web Vitals uchun
 * eng arzon yutuq (CLAUDE.md §26).
 */
export function MediaFrame({ children, ratio = 'landscape', caption, className }: MediaFrameProps) {
  const frame = (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[var(--color-line)]',
        'bg-[var(--color-ink-700)]',
        RATIOS[ratio],
        className,
      )}
    >
      {children}
    </div>
  );

  if (caption === undefined) return frame;

  return (
    <figure className="flex flex-col gap-3">
      {frame}
      <figcaption className="text-sm text-[var(--color-fg-muted)]">{caption}</figcaption>
    </figure>
  );
}
