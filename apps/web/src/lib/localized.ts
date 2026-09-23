import { LOCALES, type Locale, type Localized } from '@barff/types';

/**
 * Bazadagi ko'p tilli matndan joriy tildagisini oladi.
 *
 * Tarjima bo'lmasa BO'SH satr emas, boshqa tildagi matn qaytadi:
 * mahsulot nomi ruscha tarjimasiz qolsa, foydalanuvchi bo'sh kartochka
 * emas, o'zbekcha nomni ko'rgani yaxshiroq. Umuman matn bo'lmasa
 * `fallback` (odatda bo'sh satr) qaytadi va chaqiruvchi o'zi hal qiladi.
 */
export function text(value: Localized | null | undefined, locale: Locale, fallback = ''): string {
  if (value === null || value === undefined) return fallback;

  const exact = value[locale];
  if (typeof exact === 'string' && exact.trim().length > 0) return exact;

  for (const candidate of LOCALES) {
    const other = value[candidate];
    if (typeof other === 'string' && other.trim().length > 0) return other;
  }

  return fallback;
}

/**
 * Narxni tiyindan o'qiladigan ko'rinishga o'tkazadi.
 *
 * Server narxni BUTUN son (eng kichik birlik) sifatida beradi —
 * suzuvchi nuqtali arifmetika puldan yiroq turishi kerak.
 */
export function formatMoney(amount: number, currency: string, locale: Locale): string {
  const tag = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';

  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

/** Sana — faqat kun aniqligida; vaqt ommaviy sahifada kerak emas. */
export function formatDate(iso: string | null, locale: Locale): string {
  if (iso === null) return '';

  const tag = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(tag, { dateStyle: 'long' }).format(new Date(iso));
}
