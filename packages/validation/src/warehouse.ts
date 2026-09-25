import { z } from 'zod';
import { STOCK_MOVEMENT_TYPES } from '@barff/types';
import { paginationQuerySchema } from './primitives';

/**
 * Ombor sxemalari (CLAUDE.md §7).
 *
 * Server tekshiruvi MAJBURIY: qoldiq pul bilan bir xil darajada
 * jiddiy va mijoz tomonidagi tekshiruv chetlab o'tiladi.
 */

export const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, { message: 'Kod kiritilishi shart' })
    .max(20)
    .regex(/^[A-Z0-9-]+$/, { message: 'Kod faqat lotin harflari, raqam va chiziqchadan iborat' }),
  name: z.string().trim().min(2, { message: 'Nom kiritilishi shart' }).max(120),
  region: z.string().trim().min(2, { message: 'Hudud kiritilishi shart' }).max(120),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const warehouseUpdateSchema = warehouseSchema.partial();

/**
 * Qo'lda kiritiladigan harakat.
 *
 * `RESERVED` va `RELEASED` bu yerda YO'Q: bandlash buyurtma
 * oqimidan keladi (S31), qo'lda emas. Omborchi "band qilish"
 * tugmasini bossa, u buyurtmasiz zaxira yaratardi va hech kim uni
 * bo'shatmasdi.
 *
 * `TRANSFER` ham yo'q — u alohida endpoint, chunki IKKI tomoni bor
 * va bittasi yozilib ikkinchisi yozilmasligi mumkin emas.
 */
export const MANUAL_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] as const;

export const stockMovementSchema = z
  .object({
    warehouseId: z.uuid(),
    productVariantId: z.uuid(),
    type: z.enum(MANUAL_MOVEMENT_TYPES),
    /**
     * Miqdor. `ADJUSTMENT` da manfiy bo'lishi mumkin — u qoldiqni
     * kamaytirishi ham kerak.
     */
    quantity: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.string().trim().max(500).optional(),
    reference: z.string().trim().max(120).optional(),
  })
  .refine((value) => value.quantity !== 0, {
    message: 'Miqdor nol bo‘lishi mumkin emas',
    path: ['quantity'],
  })
  .refine((value) => value.type === 'ADJUSTMENT' || value.quantity > 0, {
    message: 'Faqat tuzatish manfiy bo‘lishi mumkin — turi ishorani belgilaydi',
    path: ['quantity'],
  })
  .refine(
    (value) =>
      value.type !== 'ADJUSTMENT' || (value.reason !== undefined && value.reason.length > 0),
    { message: 'Tuzatish uchun sabab kiritilishi shart', path: ['reason'] },
  );

/** Omborlar orasida ko'chirish. */
export const stockTransferSchema = z
  .object({
    fromWarehouseId: z.uuid(),
    toWarehouseId: z.uuid(),
    productVariantId: z.uuid(),
    quantity: z.number().int().positive().max(1_000_000),
    reason: z.string().trim().max(500).optional(),
    reference: z.string().trim().max(120).optional(),
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    message: 'Ombor o‘ziga ko‘chira olmaydi',
    path: ['toWarehouseId'],
  });

/** Kuzatuv chegarasi — qoldiq EMAS, shuning uchun to'g'ridan-to'g'ri yoziladi. */
export const lowStockThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0).max(1_000_000).nullable(),
});

export const stockListQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.uuid().optional(),
  productVariantId: z.uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  /** Faqat kam qolganlar. */
  lowOnly: z.coerce.boolean().optional(),
});

export const movementListQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.uuid().optional(),
  productVariantId: z.uuid().optional(),
  type: z.enum(STOCK_MOVEMENT_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
