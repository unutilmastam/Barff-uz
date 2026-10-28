import { z } from 'zod';

/**
 * Audit jurnali so'rovi (S38).
 *
 * Sanalar `YYYY-MM-DD` va Toshkent kuni sifatida o'qiladi (hisobotlar
 * bilan bir xil qoida, `docs/REPORTS-POLICY.md` §2).
 *
 * BITTA `refine`: zod ikkinchisini birinchisi yiqilgandan keyin ham
 * bajaradi va yaroqsiz sana `500` berardi (S37 da shunday bo'lgan).
 */
function isRealDay(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD ko‘rinishida bo‘lishi kerak' })
  .refine(isRealDay, { message: 'Bunday sana yo‘q' });

const text = (max: number) => z.string().trim().min(1).max(max);

export const auditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    from: day.optional(),
    to: day.optional(),
    /** Aniq amal: `order.status.changed`. */
    action: text(120).optional(),
    /** Soha bo'yicha: `order` -> `order.created`, `order.status.changed`, ... */
    actionPrefix: text(60).optional(),
    entity: text(80).optional(),
    entityId: text(80).optional(),
    actorId: z.uuid().optional(),
    /** Bajaruvchi emailidan qidirish. */
    actor: text(120).optional(),
    requestId: text(80).optional(),
  })
  .refine((value) => value.from === undefined || value.to === undefined || value.from <= value.to, {
    message: '«dan» sanasi «gacha» sanasidan keyin bo‘lishi mumkin emas',
    path: ['from'],
  });

export type AuditQueryInput = z.input<typeof auditQuerySchema>;
