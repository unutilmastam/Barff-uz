import { z } from 'zod';
import { REPORT_KEYS } from '@barff/types';

/**
 * Hisobot so'rovi (S37).
 *
 * SANALAR `YYYY-MM-DD` — vaqtsiz kun. Ular Toshkent kuni sifatida
 * o'qiladi (`docs/REPORTS-POLICY.md` §2). To'liq vaqtli sana qabul
 * qilinsa, "to" chegarasi yarim kunni kesib tashlardi.
 */
/**
 * BITTA `refine` — ikkita emas.
 *
 * Zod `refine` larni birinchisi yiqilsa ham KETMA-KET bajaradi.
 * Avval bu yerda ikkita edi va yaroqsiz sanada ikkinchisi
 * `new Date(NaN).toISOString()` da `RangeError` tashlab, `400` o'rniga
 * `500` qaytarardi (S37 sinovi topdi).
 */
function isRealDay(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);

  // `2026-02-31` ni JavaScript jimgina 3-martga o'tkazadi — shuning uchun aylanib qaytish tekshiriladi.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD ko‘rinishida bo‘lishi kerak' })
  .refine(isRealDay, { message: 'Bunday sana yo‘q' });

export const reportKeySchema = z.enum(REPORT_KEYS);

export const reportQuerySchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
    region: z.string().trim().min(1).max(120).optional(),
    dealerId: z.uuid().optional(),
    productId: z.uuid().optional(),
    /** JSON uchun qatorlar chegarasi. Eksport bu chegaraga BOG'LIQ EMAS. */
    limit: z.coerce.number().int().min(1).max(5000).optional(),
  })
  .refine((value) => value.from === undefined || value.to === undefined || value.from <= value.to, {
    message: '«dan» sanasi «gacha» sanasidan keyin bo‘lishi mumkin emas',
    path: ['from'],
  });

export const reportExportQuerySchema = reportQuerySchema;
