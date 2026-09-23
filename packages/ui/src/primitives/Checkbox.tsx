'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { useId } from 'react';
import { cn } from '../lib/cn';

export interface CheckboxProps extends RadixCheckbox.CheckboxProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

/**
 * Belgilash katakchasi.
 *
 * Radix ustida: u `role="checkbox"`, `aria-checked` va probel/klaviatura
 * xulqini o'zi to'g'ri beradi. `<div>` ustiga qurilgan qo'lbola variant
 * klaviatura bilan umuman ishlamas edi.
 */
export function Checkbox({ label, hint, error, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const boxId = id ?? generatedId;
  const hintId = `${boxId}-hint`;
  const errorId = `${boxId}-error`;

  const describedBy = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <RadixCheckbox.Root
          id={boxId}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          aria-invalid={error !== undefined ? true : undefined}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
            'transition-colors duration-[var(--duration-fast)]',
            'data-[state=checked]:border-[var(--color-brand-500)] data-[state=checked]:bg-[var(--color-brand-500)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error !== undefined
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-line-strong)]',
            className,
          )}
          {...props}
        >
          <RadixCheckbox.Indicator>
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path
                d="M3 8.5l3.2 3.2L13 5"
                fill="none"
                stroke="var(--color-ink-900)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>

        <label htmlFor={boxId} className="text-sm text-[var(--color-fg)]">
          {label}
        </label>
      </div>

      {hint !== undefined && (
        <p id={hintId} className="pl-7 text-xs text-[var(--color-fg-subtle)]">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="pl-7 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
