import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps {
  /** Kichik ustki yozuv (masalan "Mahsulotlar"). */
  eyebrow?: string;
  /**
   * `ReactNode`, `string` emas: sarlavha `TextReveal` kabi animatsiya
   * o'ramiga o'ralishi mumkin. Matn baribir `<h2>` ichida qoladi, ya'ni
   * hujjat tuzilmasi o'zgarmaydi.
   */
  title: ReactNode;
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
        {eyebrow !== undefined && <p className="eyebrow">{eyebrow}</p>}

        <Heading className="display-3 mt-3 block">{title}</Heading>

        {description !== undefined && <p className="lead mt-4">{description}</p>}
      </div>

      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
