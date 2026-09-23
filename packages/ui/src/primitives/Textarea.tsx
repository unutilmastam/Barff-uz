'use client';

import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, required, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedBy = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-fg)]">
        {label}
        {required === true && (
          <span className="ml-1 text-[var(--color-danger)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        className={cn(
          'w-full rounded-lg border bg-[var(--color-ink-800)] px-3.5 py-2.5 text-sm',
          'text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)]',
          'transition-colors duration-[var(--duration-fast)] resize-y',
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
        <p id={errorId} role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
});
