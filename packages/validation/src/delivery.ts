import { z } from 'zod';
import { DELIVERY_STATUSES } from '@barff/types';
import { paginationQuerySchema, phoneSchema } from './primitives';

/**
 * Yetkazib berish sxemalari (CLAUDE.md §6).
 *
 * Siyosat `docs/DELIVERY-POLICY.md` da; bu yerda faqat SHAKL
 * tekshiriladi, qoidalar esa servisda.
 */

export const vehicleSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, { message: 'Davlat raqami kiritilishi shart' })
    .max(20),
  model: z.string().trim().max(120).optional(),
  capacityKg: z.number().int().min(0).max(100_000).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const vehicleUpdateSchema = vehicleSchema.partial();

/**
 * Haydovchi profili.
 *
 * `userId` — MAVJUD foydalanuvchi. Bu yerda yangi akkaunt
 * yaratilmaydi: kirish huquqi `DRIVER` roli bilan beriladi va uni
 * admin alohida beradi. Ikkalasini bitta formaga qo'shish "rol
 * bermay profil yaratish" xatosini yashirardi.
 */
export const driverSchema = z.object({
  userId: z.uuid(),
  licenseNumber: z.string().trim().max(60).optional(),
  vehicleId: z.uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const driverUpdateSchema = driverSchema.partial().omit({ userId: true });

export const deliveryAssignSchema = z.object({
  driverId: z.uuid(),
  vehicleId: z.uuid().optional(),
  scheduledFor: z.coerce.date().optional(),
});

/**
 * Holat o'zgarishi.
 *
 * `failureReason` — `FAILED` uchun SHART. Sababsiz "yetkazilmadi"
 * logist uchun foydasiz yozuv: u baribir haydovchiga qo'ng'iroq
 * qilishi kerak bo'lardi.
 */
export const deliveryStatusSchema = z
  .object({
    status: z.enum(DELIVERY_STATUSES),
    note: z.string().trim().max(1000).optional(),
    failureReason: z.string().trim().max(1000).optional(),
    receivedBy: z.string().trim().max(120).optional(),
    proofNote: z.string().trim().max(1000).optional(),
    /**
     * Oflayn navbat kaliti (S33).
     *
     * Telefon uni amal YARATILGANDA yasaydi va qayta yuborishda
     * O'ZGARTIRMAYDI — aks holda takrorga qarshi himoya umuman
     * ishlamasdi.
     */
    idempotencyKey: z.string().trim().min(8).max(100).optional(),
  })
  .refine(
    (value) =>
      value.status !== 'FAILED' ||
      (value.failureReason !== undefined && value.failureReason.length > 0),
    { message: 'Yetkazilmagani uchun sabab kiritilishi shart', path: ['failureReason'] },
  );

export const deliveryListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(DELIVERY_STATUSES).optional(),
  driverId: z.uuid().optional(),
  region: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  unassigned: z.coerce.boolean().optional(),
});

export const deliveryNoteSchema = z.object({
  internalNote: z.string().trim().max(2000),
});

export const deliveryRouteSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  scheduledFor: z.coerce.date(),
  driverId: z.uuid().nullable().optional(),
  vehicleId: z.uuid().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

/** Haydovchi kontakti — profil ko'rsatish uchun. */
export const driverContactSchema = z.object({
  phone: phoneSchema.optional(),
});
