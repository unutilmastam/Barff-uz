/** Sana bilan ishlash. Saqlash har doim UTC ISO satrida. */

/** `2026-09-21T10:30:00.000Z` -> `2026-09-21` */
export function toISODate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const iso = date.toISOString();
  return iso.slice(0, 10);
}

export function formatDate(value: Date | string, locale = 'uz-UZ'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(value: Date | string, locale = 'uz-UZ'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

export function addDays(value: Date | string, days: number): Date {
  const date = typeof value === 'string' ? new Date(value) : new Date(value.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

/** Ikki sana orasidagi to'liq kunlar (yetkazib berish muddatlari uchun). */
export function daysBetween(from: Date | string, to: Date | string): number {
  const start = new Date(toISODate(from)).getTime();
  const end = new Date(toISODate(to)).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
