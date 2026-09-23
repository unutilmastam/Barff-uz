'use client';

import { Select } from '@barff/ui';

/**
 * Nashr holati (CLAUDE.md §8: draft/publish).
 *
 * Yangi yozuv HAR DOIM qoralama bo'ladi — nashr qilish ALOHIDA
 * qaror. Shu sababli standart qiymat `DRAFT` va uni o'zgartirish
 * uchun muharrir ataylab tanlashi kerak.
 */
export function StatusField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Select
      label="Holat"
      value={value}
      onValueChange={onChange}
      options={[
        { value: 'DRAFT', label: 'Qoralama' },
        { value: 'PUBLISHED', label: 'Nashr qilingan' },
      ]}
    />
  );
}
