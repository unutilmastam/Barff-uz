import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps {
  /** Kichik ustki yozuv (masalan "Mahsulotlar"). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Sarlavha darajasi. Sahifada `<h1>` bitta bo'lishi uchun sozlanadi. */
  as?: 'h2' | 'h3';
  align?: 'start' | 'center';
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  as: Heading = 'h2',
  align = 'start',
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow !== undefined && (
          <p className="text-sm font-medium tracking-widest text-[var(--color-brand-400)] uppercase">
            {eyebrow}
          </p>
        )}

        <Heading className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </Heading>

        {description !== undefined && (
          <p className="mt-4 text-pretty text-[var(--color-fg-muted)] sm:text-lg">{description}</p>
        )}
      </div>

      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
