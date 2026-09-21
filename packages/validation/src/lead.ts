import { z } from 'zod';
import { LEAD_STATUSES } from '@barff/types';
import { emailSchema, phoneSchema } from './primitives';

/**
 * Ommaviy B2B lead formasi (CLAUDE.md §9).
 *
 * Maydonlar ro'yxati spec'dan olingan. `honeypot` — botlarga qarshi yashirin
 * maydon: odam uni ko'rmaydi, bot to'ldiradi; to'lgan bo'lsa so'rov rad etiladi.
 */
export const BUSINESS_TYPES = ['DISTRIBUTOR', 'WHOLESALE', 'RETAIL', 'HORECA', 'OTHER'] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const leadCreateSchema = z.object({
  companyName: z.string().trim().min(2, { message: 'Kompaniya nomi kiritilishi shart' }).max(200),
  contactName: z.string().trim().min(2, { message: 'Ism kiritilishi shart' }).max(120),
  phone: phoneSchema,
  email: emailSchema.optional(),
  region: z.string().trim().min(2, { message: 'Hudud tanlanishi shart' }).max(120),
  businessType: z.enum(BUSINESS_TYPES),
  desiredProducts: z.string().trim().max(1000).optional(),
  /** Oylik taxminiy hajm (dona). Aniq birlik S22 da mijoz bilan aniqlanadi. */
  estimatedMonthlyVolume: z.coerce.number().int().min(0).max(10_000_000).optional(),
  message: z.string().trim().max(2000).optional(),
  /** Bot tuzog'i — bo'sh bo'lishi shart. */
  honeypot: z.string().max(0).optional(),
});

export type LeadCreateInput = z.input<typeof leadCreateSchema>;
export type LeadCreateOutput = z.output<typeof leadCreateSchema>;

export const leadStatusUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  note: z.string().trim().max(2000).optional(),
});
