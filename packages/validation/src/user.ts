import { z } from 'zod';
import { emailSchema, paginationQuerySchema, passwordSchema, phoneSchema } from './primitives';

/**
 * Xodimlar boshqaruvi (admin).
 *
 * Bu yerda faqat XODIM rollari: diler akkauntlari ariza orqali
 * yaratiladi va dilerlar bo'limidan boshqariladi; `VISITOR` — kirmagan
 * mehmon, unga akkaunt ochilmaydi.
 */
export const STAFF_ROLES = ['SALES', 'WAREHOUSE', 'LOGISTICS', 'DRIVER', 'ADMIN'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const staffRolesSchema = z
  .array(z.enum(STAFF_ROLES))
  .min(1, { message: 'Kamida bitta rol tanlang' })
  .max(STAFF_ROLES.length)
  .refine((roles) => new Set(roles).size === roles.length, { message: 'Rollar takrorlanmasin' });

const fullNameSchema = z.string().trim().min(2).max(120);

export const staffCreateSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  roles: staffRolesSchema,
});

/** Qisman: faqat yuborilgan maydon o'zgaradi (`isActive` — bloklash/ochish). */
export const staffUpdateSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Kamida bitta maydon o'zgartirilishi kerak",
  });

export const staffRolesUpdateSchema = z.object({ roles: staffRolesSchema });

export const staffPasswordResetSchema = z.object({ password: passwordSchema });

export const staffListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(2).max(100).optional(),
});

export type StaffCreateInput = z.input<typeof staffCreateSchema>;
