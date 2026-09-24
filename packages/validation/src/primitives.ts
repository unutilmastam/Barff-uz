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
/**
 * Ko'p tilli maydon (CLAUDE.md §18).
 *
 * KAMIDA BITTA til to'ldirilishi shart, uchalasi emas. Sabab amaliy:
 * muharrir yangilikni o'zbekcha yozadi, tarjimon esa ruscha va
 * inglizchasini keyinroq qo'shadi. Uchala tilni talab qilish bu
 * oqimni butunlay bloklardi — qoralama saqlash uchun ham o'rindosh
 * matn yozishga majbur qilardi.
 *
 * Ko'rsatish tomonida bu xavfsiz: `text()` yordamchisi tarjimasi yo'q
 * tilda boshqa tildagi matnni ko'rsatadi, bo'sh joy qoldirmaydi.
 *
 * Bo'sh satrlar OLIB TASHLANADI, ya'ni `{ uz: 'X', ru: '', en: '' }`
 * bazaga `{ uz: 'X' }` bo'lib tushadi va "tarjima bor, lekin bo'sh"
 * degan chalkash holat yuzaga kelmaydi.
 */
export const localizedSchema = (field: z.ZodString) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'object' || value === null) return value;

      /*
        Bo'sh satr "berilmagan" degani va u TEKSHIRUVDAN OLDIN olib
        tashlanadi. Aks holda `field.min(1)` uni rad etardi — ya'ni
        formada to'ldirilmagan til butun yozuvni saqlashga to'sqinlik
        qilardi.
      */
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          ([, text]) => !(typeof text === 'string' && text.trim().length === 0),
        ),
      );
    },
    z
      .object({
        uz: field.optional(),
        ru: field.optional(),
        en: field.optional(),
      })
      .refine((value) => Object.values(value).some((text) => text !== undefined), {
        message: 'Kamida bitta tilda matn kiritilishi shart',
      }),
  );

/** Ro'yxat so'rovlari uchun umumiy parametrlar (CLAUDE.md §11). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().min(1).optional(),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;
export type PaginationQueryOutput = z.output<typeof paginationQuerySchema>;
