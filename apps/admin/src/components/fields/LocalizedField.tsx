'use client';

import { LOCALES, type Locale, type Localized } from '@barff/types';
import { Input, Textarea } from '@barff/ui';
import { useState } from 'react';

const LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

/**
 * Ko'p tilli maydon (CLAUDE.md §18).
 *
 * Uchala til bitta maydonning VARIANTLARI, shuning uchun ular
 * yonma-yon emas, ichki ko'rinishlarda beriladi — aks holda forma
 * uch barobar uzayib ketardi va muharrir qaysi til qayerdaligini
 * yo'qotardi.
 *
 * To'ldirilgan tillar ko'rinib turadi: nuqta belgisi bo'sh tilni
 * darhol ko'rsatadi. Busiz muharrir ruscha tarjimani unutib,
 * saqlagach xato olardi.
 */
export function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  error,
  hint,
}: {
  label: string;
  value: Localized;
  onChange: (next: Localized) => void;
  multiline?: boolean;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  const [active, setActive] = useState<Locale>('uz');

  const Field = multiline ? Textarea : Input;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {LOCALES.map((locale) => {
          const filled = (value[locale] ?? '').trim().length > 0;

          return (
            <button
              key={locale}
              type="button"
              onClick={() => setActive(locale)}
              aria-pressed={active === locale}
              className={[
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
                active === locale
                  ? 'bg-[var(--color-glass)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
              ].join(' ')}
            >
              {LABELS[locale]}
              <span
                aria-hidden="true"
                className={[
                  'size-1.5 rounded-full',
                  filled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-line-strong)]',
                ].join(' ')}
              />
              <span className="sr-only">{filled ? "to'ldirilgan" : "bo'sh"}</span>
            </button>
          );
        })}
      </div>

      <Field
        label={`${label} — ${LABELS[active]}`}
        required={required}
        error={error}
        hint={hint}
        value={value[active] ?? ''}
        onChange={(event) => onChange({ ...value, [active]: event.target.value })}
        {...(multiline ? { rows: 5 } : {})}
      />
    </div>
  );
}

/** Bo'sh ko'p tilli qiymat. */
export function emptyLocalized(): Localized {
  return { uz: '', ru: '', en: '' };
}

/** Kamida bitta til to'ldirilganmi. */
export function hasAnyTranslation(value: Localized | null | undefined): boolean {
  if (value == null) return false;

  return LOCALES.some((locale) => (value[locale] ?? '').trim().length > 0);
}
