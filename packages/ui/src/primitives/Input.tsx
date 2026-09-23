'use client';

import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../lib/cn';

/**
 * DIQQAT: ixtiyoriy matn xossalari `| undefined` bilan yozilgan.
 *
 * `exactOptionalPropertyTypes` yoqilgan, shuning uchun `error?: string`
 * bo'lsa, chaqiruvchi `errors.x?.message` (ya'ni `string | undefined`)
 * ni bera olmasdi — holbuki "xato yo'q" aynan shu qiymat bilan
 * ifodalanadi.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Maydon ostidagi izoh. */
  hint?: string | undefined;
  /** Validatsiya xatosi. Berilsa, maydon xato holatiga o'tadi. */
  error?: string | undefined;
}

/**
 * Matn maydoni — yorliq bilan birga.
 *
 * `label` MAJBURIY: yorliqsiz maydon ekran o'quvchida "matn maydoni" deb
 * o'qiladi va foydalanuvchi nima kiritishni bilmaydi. Placeholder yorliq
 * o'rnini bosa olmaydi — u yozish boshlanishi bilan yo'qoladi.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-fg)]">
        {label}
        {required === true && (
          <span className="ml-1 text-[var(--color-danger)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        className={cn(
          'h-11 w-full rounded-lg border bg-[var(--color-ink-800)] px-3.5 text-sm',
          'text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)]',
          'transition-colors duration-[var(--duration-fast)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error !== undefined
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-line-strong)] hover:border-[var(--color-fg-subtle)]',
          className,
        )}
        {...props}
      />

      {hint !== undefined && (
        <p id={hintId} className="text-xs text-[var(--color-fg-subtle)]">
          {hint}
        </p>
      )}

      {error !== undefined && (
        // `role="alert"` — xato paydo bo'lganda ekran o'quvchi darhol o'qiydi.
        <p id={errorId} role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
});
