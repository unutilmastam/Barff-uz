import { z } from 'zod';

/**
 * Yaratish sxemasidan YANGILASH sxemasini yasaydi.
 *
 * NEGA `.partial()` yetarli emas: u maydonlarni ixtiyoriy qiladi, lekin
 * `.default()` ni OLIB TASHLAMAYDI. Natijada qisman yangilashda berilmagan
 * maydonga standart qiymat yozilib qoladi.
 *
 * Bu jimgina ishlaydigan va zararli xato edi:
 *   - nashr qilingan maqolaning sarlavhasini o'zgartirsangiz,
 *     `status` standart `DRAFT` ga tushib, maqola saytdan yo'qolardi;
 *   - mahsulotning slug'ini o'zgartirsangiz, `isActive` `true` ga va
 *     `displayOrder` `0` ga qaytardi.
 *
 * Shuning uchun standart qiymatlar FAQAT yaratish sxemasida qoladi,
 * yangilashda esa berilmagan maydon — "tegilmaydi" degani.
 */
type UpdateShape<T extends z.ZodRawShape> = {
  [K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer Inner> ? Inner : T[K]>;
};

export function toUpdateSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<UpdateShape<T>> {
  const shape: Record<string, z.ZodType> = {};

  for (const [key, field] of Object.entries(schema.shape)) {
    const value = field as z.ZodType;
    // `ZodDefault` ni yechib, ichidagi asl sxemani olamiz.
    // `.unwrap()` Zod'ning YADRO tipini qaytaradi (`$ZodType`), unda
    // `.optional()` yo'q — shuning uchun ommaviy tipga qaytariladi.
    const withoutDefault = (value instanceof z.ZodDefault ? value.unwrap() : value) as z.ZodType;
    shape[key] = withoutDefault.optional();
  }

  return z.object(shape) as unknown as z.ZodObject<UpdateShape<T>>;
}
