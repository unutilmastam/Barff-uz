'use client';

import { useId } from 'react';

/**
 * Miqdor tanlagich.
 *
 * TELEFON UCHUN: tugmalar 44×44px — barmoq uchun eng kam o'lcham.
 * Maydonning o'zi ham qo'lda kiritishga ochiq, chunki diler 500 dona
 * buyurtma berganda tugmani 500 marta bosmaydi.
 *
 * `inputMode="numeric"` — telefonda RAQAMLI klaviatura ochiladi.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const clamp = (next: number) => Math.max(min, Math.min(next, 1_000_000));

  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <button
        type="button"
        aria-label="Kamaytirish"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="flex size-11 items-center justify-center rounded-lg border border-[var(--color-line-strong)] text-lg disabled:opacity-40"
      >
        −
      </button>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        disabled={disabled}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '');
          // Bo'sh maydon — foydalanuvchi o'chirib yozmoqda; `min` ga
          // sakratish yozishni imkonsiz qilardi.
          onChange(digits === '' ? min : clamp(Number(digits)));
        }}
        className="h-11 w-16 rounded-lg border border-[var(--color-line-strong)] bg-transparent text-center tabular-nums"
      />

      <button
        type="button"
        aria-label="Ko‘paytirish"
        disabled={disabled}
        onClick={() => onChange(clamp(value + 1))}
        className="flex size-11 items-center justify-center rounded-lg border border-[var(--color-line-strong)] text-lg disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
