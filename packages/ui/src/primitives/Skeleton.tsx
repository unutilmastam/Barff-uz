import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * Yuklanish o'rindoshi.
 *
 * `aria-hidden` — ekran o'quvchi bo'sh to'rtburchaklarni o'qimasligi kerak.
 * Yuklanish haqidagi xabar alohida, `role="status"` bilan beriladi.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[var(--color-ink-700)]', className)}
      {...props}
    />
  );
}
