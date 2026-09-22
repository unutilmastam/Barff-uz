import { cn } from '../lib/cn';

export interface Stat {
  value: string;
  label: string;
  /**
   * Ma'lumot tasdiqlanmagan bo'lsa `true`.
   *
   * CLAUDE.md §1: kompaniya faktlari o'ylab topilmaydi. Tasdiqlanmagan
   * raqam ko'rsatilsa, u AYNIQSA belgilanishi kerak, aks holda u
   * haqiqatdek ko'rinadi.
   */
  unverified?: boolean;
}

export interface StatBlockProps {
  stats: readonly Stat[];
  /** Tasdiqlanmagan ma'lumot yonidagi yozuv (tarjima ilovadan keladi). */
  unverifiedLabel?: string;
  className?: string;
}

/** Kompaniya raqamlari (CLAUDE.md §4: faqat tasdiqlangan faktlar). */
export function StatBlock({ stats, unverifiedLabel, className }: StatBlockProps) {
  return (
    <dl className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="border-t border-[var(--color-line)] pt-6">
          <dt className="text-sm text-[var(--color-fg-muted)]">
            {stat.label}
            {stat.unverified === true && unverifiedLabel !== undefined && (
              <span className="ml-2 text-xs text-[var(--color-warning)]">{unverifiedLabel}</span>
            )}
          </dt>
          <dd className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
