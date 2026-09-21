import { z } from 'zod';
import { isValidUzPhone, normalizePhone } from '@barff/utils';
import { LOCALES, SORT_ORDERS } from '@barff/types';

/**
 * Qayta ishlatiladigan asosiy sxemalar.
 *
 * DIQQAT: bu sxemalar klientda ham, serverda ham ishlaydi, lekin
 * SERVER tekshiruvi majburiy (CLAUDE.md §11, §12). Klientdagi validatsiya
 * faqat foydalanuvchiga qulaylik uchun.
 */

export const idSchema = z.uuid({ message: "Noto'g'ri identifikator" });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: 'Email kiritilishi shart' })
  .email({ message: "Email manzili noto'g'ri" });

/** O'zbekiston raqami. Saqlashdan oldin 998XXXXXXXXX ko'rinishiga keltiriladi. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: 'Telefon raqami kiritilishi shart' })
  .refine(isValidUzPhone, { message: "Telefon raqami noto'g'ri (+998 XX XXX XX XX)" })
  .transform(normalizePhone);

/**
 * Parol talablari. Uzunlik asosiy himoya — murakkablik qoidalari
 * foydalanuvchini bir xil andozaga majburlaydi va amalda kuchni oshirmaydi.
 */
export const passwordSchema = z
  .string()
  .min(10, { message: 'Parol kamida 10 ta belgidan iborat bo’lishi kerak' })
  .max(128, { message: 'Parol juda uzun' });

export const localeSchema = z.enum(LOCALES);

/** Ko'p tilli matn: uchala til ham to'ldirilishi shart. */
export const localizedSchema = (field: z.ZodString) =>
  z.object({ uz: field, ru: field, en: field });

/** Ro'yxat so'rovlari uchun umumiy parametrlar (CLAUDE.md §11). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().min(1).optional(),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;
export type PaginationQueryOutput = z.output<typeof paginationQuerySchema>;
