import { type Locale, type Localized } from '@barff/types';
import { text } from './localized';

/**
 * `site.contact` sozlamasini xavfsiz o'qish.
 *
 * Sozlama qiymati — ixtiyoriy JSON, ya'ni bu yerga NIMA kelishi
 * kafolatlanmagan. Shuning uchun har bir maydon alohida tekshiriladi:
 * noto'g'ri shakl sahifani yiqitmasligi kerak.
 *
 * `REPLACE_WITH_REAL_DATA` — seed'dagi o'rindosh. U KO'RSATILMAYDI:
 * tashrifchi uni telefon raqami deb o'qib qolmasin.
 */
const PLACEHOLDER = 'REPLACE_WITH_REAL_DATA';

export interface ContactInfo {
  phone: string | null;
  email: string | null;
  address: string | null;
}

function real(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === PLACEHOLDER) return null;

  return trimmed;
}

export function readContact(settings: Record<string, unknown> | null, locale: Locale): ContactInfo {
  const raw = settings?.['site.contact'];
  if (typeof raw !== 'object' || raw === null) {
    return { phone: null, email: null, address: null };
  }

  const value = raw as Record<string, unknown>;
  const address =
    typeof value['address'] === 'object' && value['address'] !== null
      ? real(text(value['address'] as Localized, locale))
      : real(value['address']);

  return {
    phone: real(value['phone']),
    email: real(value['email']),
    address,
  };
}
