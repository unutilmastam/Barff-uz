import { type Locale } from './config';
import { type Messages, uz } from './messages/uz';

/**
 * Tarjimalarni yuklash.
 *
 * NEGA tashqi i18n kutubxonasi emas: S06 doirasida kerak bo'lgani —
 * marshrutlash va kalitlar. Bu yondashuv TIP darajasida tekshiriladi
 * (`Messages` tipi tufayli tarjima qilinmagan kalit kompilyatsiyada
 * ushlanadi), va qo'shimcha bog'liqlik talab qilmaydi.
 *
 * To'liq i18n strategiyasi — bazadagi ko'p tilli kontent bilan birga —
 * S15 da hal qilinadi; o'shanda kutubxona kerak bo'lsa, almashtirish
 * faqat shu fayl va `useTranslations` ga tegadi.
 */
const loaders: Record<Locale, () => Promise<Messages>> = {
  uz: () => Promise.resolve(uz),
  ru: () => import('./messages/ru').then((m) => m.ru),
  en: () => import('./messages/en').then((m) => m.en),
};

export function getMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}

export { type Messages };
