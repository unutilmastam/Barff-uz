import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--color-line-strong)] text-[var(--color-fg-muted)]',
  brand: 'border-[var(--color-accent-text)] text-[var(--color-accent-text)]',
  success: 'border-[var(--color-success)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
  danger: 'border-[var(--color-danger)] text-[var(--color-danger)]',
  info: 'border-[var(--color-info)] text-[var(--color-info)]',
};

/**
 * Holat belgisi (buyurtma, yetkazib berish, lead holatlari uchun).
 *
 * Rang YAGONA belgi emas — matn har doim yoziladi. Rang ko'rmaydigan
 * foydalanuvchi ham holatni o'qiy olishi kerak (CLAUDE.md §29).
 */
export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5',
        'text-xs font-medium tracking-wide',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
