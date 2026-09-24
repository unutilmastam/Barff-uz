import { z } from 'zod';
import { DEALER_STATUSES } from '@barff/types';
import { emailSchema, passwordSchema, phoneSchema } from './primitives';
import { BUSINESS_TYPES } from './lead';

/**
 * Diler domeni sxemalari (CLAUDE.md §5).
 *
 * Bir manba: ro'yxatdan o'tish formasi (web), diler paneli va server
 * bir xil qoidalarni ishlatadi. Server tekshiruvi baribir MAJBURIY
 * (CLAUDE.md §11) — klientdagi nusxa faqat qulaylik uchun.
 */

/**
 * Diler ro'yxatdan o'tish arizasi.
 *
 * Bu forma bir vaqtda IKKI narsa yaratadi: kirish akkaunti va diler
 * tashkiloti. Shuning uchun ikkalasining maydonlari birga keladi.
 *
 * `honeypot` — lead formasidagi kabi bot tuzog'i.
 */
export const dealerRegisterSchema = z.object({
  companyName: z.string().trim().min(2, { message: 'Kompaniya nomi kiritilishi shart' }).max(200),
  /** STIR (INN) — O'zbekistonda 9 raqam. Ixtiyoriy: ariza bosqichida hali bo'lmasligi mumkin. */
  taxId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, { message: "STIR 9 ta raqamdan iborat bo'lishi kerak" })
    .optional(),
  region: z.string().trim().min(2, { message: 'Hudud tanlanishi shart' }).max(120),
  businessType: z.enum(BUSINESS_TYPES),

  contactName: z.string().trim().min(2, { message: 'Ism kiritilishi shart' }).max(120),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,

  message: z.string().trim().max(2000).optional(),

  /** Bot tuzog'i — bo'sh bo'lishi shart. */
  honeypot: z.string().max(0).optional(),
});

export type DealerRegisterInput = z.input<typeof dealerRegisterSchema>;
export type DealerRegisterOutput = z.output<typeof dealerRegisterSchema>;

/**
 * Diler o'z profilini tahrirlaydi.
 *
 * `status`, `tierId` va `creditLimit` BU YERDA YO'Q va bo'lmaydi:
 * ular biznes qarori va faqat admin o'zgartiradi. Sxemaga qo'shilsa,
 * diler o'ziga o'zi chegirma bera olardi.
 */
export const dealerProfileUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(200).optional(),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, { message: "STIR 9 ta raqamdan iborat bo'lishi kerak" })
    .optional(),
  region: z.string().trim().min(2).max(120).optional(),
  contactName: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
});

/** Manzil — diler o'zi boshqaradi. */
export const dealerAddressSchema = z.object({
  label: z.string().trim().min(2, { message: 'Manzil nomi kiritilishi shart' }).max(120),
  region: z.string().trim().min(2, { message: 'Hudud kiritilishi shart' }).max(120),
  district: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  street: z.string().trim().min(3, { message: "Ko'cha va uy kiritilishi shart" }).max(300),
  notes: z.string().trim().max(500).optional(),
  contactName: z.string().trim().min(2, { message: 'Ism kiritilishi shart' }).max(120),
  contactPhone: phoneSchema,
  /**
   * Birinchi manzil ATAYLAB standart bo'ladi (servis hal qiladi),
   * shuning uchun bu yerda ixtiyoriy.
   */
  isDefault: z.boolean().optional(),
});

export const dealerAddressUpdateSchema = dealerAddressSchema.partial();

/**
 * Admin diler holatini o'zgartiradi.
 *
 * `reason` RAD ETISH va TO'XTATISH uchun MAJBURIY: dilerga sababsiz
 * "rad etildi" ko'rsatish uni qo'ng'iroq qilishga majbur qiladi va
 * xodimning vaqtini yeydi.
 */
export const dealerStatusUpdateSchema = z
  .object({
    status: z.enum(DEALER_STATUSES),
    reason: z.string().trim().max(2000).optional(),
    internalNote: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) =>
      (value.status !== 'REJECTED' && value.status !== 'SUSPENDED') ||
      (value.reason !== undefined && value.reason.length > 0),
    { message: 'Rad etish va to‘xtatish uchun sabab kiritilishi shart', path: ['reason'] },
  );

/** Admin diler shartlarini belgilaydi. */
export const dealerTermsUpdateSchema = z.object({
  tierId: z.uuid().nullable().optional(),
  /** Tiyinda. `null` — limit yo'q (faqat oldindan to'lov). */
  creditLimit: z.number().int().min(0).max(100_000_000_00).nullable().optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

/** Daraja — admin CRUD. */
export const dealerTierSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,32}$/, { message: 'Kod faqat lotin harf, raqam va _ dan iborat' }),
  name: z.string().trim().min(2).max(120),
  /** Bazis punkt: 250 = 2.5%. 10000 = 100%, ya'ni tekin — shuning uchun chegara. */
  discountBasisPoints: z.number().int().min(0).max(5000),
  minOrderAmount: z.number().int().min(0).max(100_000_000_00).nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
});

export const dealerTierUpdateSchema = dealerTierSchema.partial();
