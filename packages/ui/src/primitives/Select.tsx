'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { useId } from 'react';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

export interface SelectProps {
  label: string;
  options: readonly SelectOption[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  name?: string | undefined;
}

/**
 * Tanlov ro'yxati.
 *
 * Radix ustida: klaviatura bilan yurish, harf bosib qidirish va fokusni
 * qaytarish tayyor holda keladi. Native `<select>` ni dark mavzuda
 * uslublash brauzerlararo ishonchsiz, shuning uchun u ishlatilmayapti.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  ...props
}: SelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-fg)]">
        {label}
        {required === true && (
          <span className="ml-1 text-[var(--color-danger)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/*
        Radix `undefined` qiymatli kalitni qabul qilmaydi
        (`exactOptionalPropertyTypes`), shuning uchun berilmagan
        xossalar umuman uzatilmaydi.
      */}
      <RadixSelect.Root
        {...(props.value !== undefined ? { value: props.value } : {})}
        {...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {})}
        {...(props.onValueChange !== undefined ? { onValueChange: props.onValueChange } : {})}
        {...(props.disabled !== undefined ? { disabled: props.disabled } : {})}
        {...(props.name !== undefined ? { name: props.name } : {})}
      >
        <RadixSelect.Trigger
          id={id}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          aria-invalid={error !== undefined ? true : undefined}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-lg border',
            'bg-[var(--color-ink-800)] px-3.5 text-sm text-[var(--color-fg)]',
            'transition-colors duration-[var(--duration-fast)]',
            'data-[placeholder]:text-[var(--color-fg-subtle)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error !== undefined
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-line-strong)] hover:border-[var(--color-fg-subtle)]',
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <svg viewBox="0 0 16 16" className="size-4 opacity-60" aria-hidden="true">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border',
              'border-[var(--color-line-strong)] bg-[var(--color-ink-800)] shadow-xl',
            )}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  // `exactOptionalPropertyTypes` yoqilgan: Radix `disabled`
                  // ni `boolean` deb kutadi, `boolean | undefined` emas.
                  {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
                  className={cn(
                    'cursor-pointer select-none rounded-md px-3 py-2 text-sm outline-none',
                    'text-[var(--color-fg-muted)]',
                    'data-[highlighted]:bg-[var(--color-glass)] data-[highlighted]:text-[var(--color-fg)]',
                    'data-[state=checked]:text-[var(--color-brand-400)]',
                    'data-[disabled]:opacity-40',
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

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
}
