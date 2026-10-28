import { z } from 'zod';
import { INVOICE_STATUSES, PAYMENT_METHODS } from '@barff/types';
import { paginationQuerySchema } from './primitives';

/**
 * Pul sxemalari (CLAUDE.md §10, S36).
 *
 * Bu yerda faqat SHAKL tekshiriladi; qoidalar servisda va
 * `docs/BILLING-POLICY.md` da.
 *
 * HAMMA SUMMA TIYINDA VA BUTUN SONDA. `z.number().int()` —
 * bu yerdagi eng muhim shart: kasr summa balansda yaxlitlash
 * xatosini to'plardi va u hech qayerda ko'rinmasdi.
 */

/** Tiyindagi MUSBAT summa. */
const minorAmount = z
  .number()
  .int({ message: "Summa tiyinda, butun son bo'lishi kerak" })
  .positive({ message: "Summa noldan katta bo'lishi kerak" })
  .max(1_000_000_000_000, { message: 'Summa juda katta' });

export const invoiceCreateSchema = z.object({
  orderId: z.uuid(),
  /** Berilmasa servis standart muddatni qo'yadi. */
  dueAt: z.coerce.date().optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

export const invoiceUpdateSchema = z.object({
  dueAt: z.coerce.date().nullable().optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

/**
 * Bekor qilishda SABAB SHART.
 *
 * Sababsiz bekor qilingan hisob-faktura buxgalter uchun foydasiz
 * yozuv: u baribir so'rab chiqishi kerak bo'lardi. Xuddi
 * yetkazmadagi `failureReason` kabi (S32).
 */
export const invoiceCancelSchema = z.object({
  reason: z.string().trim().min(3, { message: 'Bekor qilish sababi shart' }).max(1000),
});

export const invoiceListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(INVOICE_STATUSES).optional(),
  dealerId: z.uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  /** Faqat qarzi qolganlar. */
  openOnly: z.coerce.boolean().optional(),
  /** Muddati o'tganlar. */
  overdueOnly: z.coerce.boolean().optional(),
});

/**
 * To'lov yozuvi.
 *
 * `receivedAt` — pul QACHON kelgani, yozuv qachon kiritilgani
 * emas. Ikkalasini bitta maydonga yig'ish oy yopilishini
 * buzardi: kecha kelgan pul bugun kiritilsa, u kechagi oyga
 * tushishi kerak.
 */
export const paymentCreateSchema = z.object({
  dealerId: z.uuid(),
  amount: minorAmount,
  method: z.enum(PAYMENT_METHODS),
  receivedAt: z.coerce.date(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
  /**
   * Qaysi hisob-fakturalarga taqsimlansin.
   *
   * Bo'sh bo'lsa — servis ESKISIDAN BOSHLAB avtomatik
   * taqsimlaydi. Bu eng ko'p uchraydigan holat va uni qo'lda
   * qildirish xatoga yo'l ochardi.
   */
  allocations: z
    .array(z.object({ invoiceId: z.uuid(), amount: minorAmount }))
    .max(50)
    .optional(),
});

export const paymentListQuerySchema = paginationQuerySchema.extend({
  dealerId: z.uuid().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

/** Mavjud to'lovni qayta taqsimlash. */
export const paymentAllocateSchema = z.object({
  allocations: z
    .array(z.object({ invoiceId: z.uuid(), amount: minorAmount }))
    .min(1)
    .max(50),
});

/** Kredit limiti — tiyinda. `null` limitni OLIB TASHLAYDI. */
export const creditLimitSchema = z.object({
  creditLimit: z
    .number()
    .int({ message: "Limit tiyinda, butun son bo'lishi kerak" })
    .min(0, { message: "Limit manfiy bo'la olmaydi" })
    .max(1_000_000_000_000)
    .nullable(),
});
