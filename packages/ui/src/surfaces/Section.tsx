import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type SectionTone = 'base' | 'raised';

const TONES: Record<SectionTone, string> = {
  base: 'bg-[var(--color-ink-900)]',
  // Qatlamlarni ajratish uchun: qo'shni bo'limlar bir-biridan farq qiladi.
  raised: 'bg-[var(--color-ink-800)]',
};

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
}

/**
 * Sahifa bo'limi.
 *
 * Vertikal bo'shliq shu yerda markazlashtirilgan — har bir sahifada
 * qo'lda `py-20` yozilsa, ular vaqt o'tib bir-biridan farq qilib ketardi.
 */
export function Section({ className, tone = 'base', ...props }: SectionProps) {
  return <section className={cn('py-20 sm:py-28', TONES[tone], className)} {...props} />;
}
