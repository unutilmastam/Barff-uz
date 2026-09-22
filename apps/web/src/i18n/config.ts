import { LOCALES, type Locale } from '@barff/types';

export { LOCALES, type Locale };

/** Standart til — o'zbekcha (CLAUDE.md §18). */
export const DEFAULT_LOCALE: Locale = 'uz';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Til tanlagichda ko'rsatiladigan nomlar — o'z tilida yoziladi. */
export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};
