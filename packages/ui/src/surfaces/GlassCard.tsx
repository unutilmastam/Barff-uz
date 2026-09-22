import { type ElementType, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `true` — sichqoncha ostida sal yorishadi (bosiladigan kartalar uchun). */
  interactive?: boolean;
}

/**
 * Shaffof yuza (CLAUDE.md §16).
 *
 * Retsept: juda past shaffoflikdagi oq qatlam + ingichka chegara +
 * blur. Gradient QO'SHILMAYDI — spec "restrained gradients" deydi va
 * shisha effekti o'zi yetarli chuqurlik beradi.
 */
export function GlassCard({
  className,
  as: Component = 'div',
  interactive = false,
  ...props
}: GlassCardProps) {
  return (
    <Component
      className={cn(
        'rounded-xl border border-[var(--color-line)] bg-[var(--color-glass)]',
        'backdrop-blur-md',
        interactive &&
          'transition-colors duration-[var(--duration-base)] hover:border-[var(--color-line-strong)] hover:bg-[color-mix(in_oklab,var(--color-glass)_180%,transparent)]',
        className,
      )}
      {...props}
    />
  );
}
