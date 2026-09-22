'use client';

import { cn } from '../lib/cn';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Ekran o'quvchi uchun nomlar — tarjima ilovadan keladi. */
  labels: { navigation: string; previous: string; next: string; page: (n: number) => string };
  className?: string;
}

/**
 * Sahifalash.
 *
 * `<nav>` + `aria-current="page"` bilan: ekran o'quvchi qaysi sahifada
 * turganini aytadi. Raqamlar qisqartirilganda ham joriy sahifa har doim
 * ko'rinadi.
 */
export function Pagination({ page, totalPages, onPageChange, labels, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = visiblePages(page, totalPages);

  return (
    <nav aria-label={labels.navigation} className={cn('flex items-center gap-1.5', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={labels.previous}
      >
        ‹
      </Button>

      {pages.map((value, index) =>
        value === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-[var(--color-fg-subtle)]"
          >
            …
          </span>
        ) : (
          <Button
            key={value}
            variant={value === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(value)}
            aria-current={value === page ? 'page' : undefined}
            aria-label={labels.page(value)}
          >
            {value}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={labels.next}
      >
        ›
      </Button>
    </nav>
  );
}

/**
 * Ko'rsatiladigan sahifa raqamlari. `null` — uzilish belgisi.
 *
 * Har doim: birinchi, oxirgi, joriy va uning qo'shnilari.
 */
export function visiblePages(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: (number | null)[] = [1];

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) result.push(null);
  for (let i = start; i <= end; i += 1) result.push(i);
  if (end < totalPages - 1) result.push(null);

  result.push(totalPages);
  return result;
}
