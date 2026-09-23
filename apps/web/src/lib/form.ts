import { z } from 'zod';

/**
 * Formadagi bo'sh satrlarni "berilmagan" deb hisoblaydi.
 *
 * NEGA kerak: HTML formada to'ldirilmagan maydon `''` beradi, sxemada
 * esa u `undefined` bo'lishi kerak. Aks holda to'ldirilmagan email
 * `''` sifatida tekshiriladi va "noto'g'ri email" xatosini beradi —
 * ya'ni ixtiyoriy maydon amalda majburiyga aylanadi.
 *
 * Sxemaning O'ZI o'zgartirilmaydi: server bilan bir xil qoidalar
 * saqlanadi, faqat mijozdagi kiritish moslashtiriladi.
 */
export function withEmptyAsUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'object' || value === null) return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        typeof item === 'string' && item.trim().length === 0 ? undefined : item,
      ]),
    );
  }, schema);
}
