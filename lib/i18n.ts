import { en, ru, uz, type Dictionary } from '@/data/locales';
import type { Locale } from '@/lib/types';

export type { Dictionary };

/** Qo'llab-quvvatlanadigan tillar — LanguageSwitcher shu ro'yxatdan quriladi. */
export const LOCALES = ['uz', 'ru', 'en'] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = 'uz';

/** Switcher'dagi qisqa yorliqlar. */
export const LOCALE_LABELS: Record<Locale, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
};

/** `<html lang>` uchun to'liq kodlar. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  uz: 'uz',
  ru: 'ru',
  en: 'en',
};

const dictionaries: Record<Locale, Dictionary> = { uz, ru, en };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Tanlangan til brauzerda shu kalit ostida saqlanadi. */
export const LOCALE_STORAGE_KEY = 'barff-locale';
