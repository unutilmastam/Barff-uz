import { z } from 'zod';
import { localizedSchema, paginationQuerySchema } from './primitives';
import { seoSchema, slugSchema } from './product';
import { toUpdateSchema } from './update-schema';

/**
 * Kontent sxemalari (yangiliklar, sertifikatlar, galereya, hujjatlar).
 *
 * Nashr holati barcha turlarda bir xil: `DRAFT` yoki `PUBLISHED`.
 * Standart qiymat — `DRAFT`, ya'ni yangi yozuv o'z-o'zidan saytga
 * chiqmaydi; nashr qilish ALOHIDA qaror bo'lishi kerak.
 */
export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

export const contentStatusSchema = z.enum(CONTENT_STATUSES).default('DRAFT');

const title = z.string().trim().min(1).max(200);
const body = z.string().trim().min(1).max(50_000);
const shortText = z.string().trim().min(1).max(1000);

export const newsCreateSchema = z.object({
  slug: slugSchema,
  title: localizedSchema(title),
  excerpt: localizedSchema(shortText).optional(),
  body: localizedSchema(body),
  coverImageId: z.uuid().optional(),
  status: contentStatusSchema,
  /**
   * Nashr sanasi. Kelajakdagi sana — rejalashtirilgan nashr: yozuv
   * `PUBLISHED` bo'lsa ham, sanasi kelmaguncha ommaviy API uni
   * ko'rsatmaydi.
   */
  publishedAt: z.coerce.date().optional(),
  seo: seoSchema.optional(),
});

export const newsUpdateSchema = toUpdateSchema(newsCreateSchema);

export const certificateCreateSchema = z.object({
  title: localizedSchema(title),
  description: localizedSchema(shortText).optional(),
  issuer: z.string().trim().max(200).optional(),
  number: z.string().trim().max(100).optional(),
  issuedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  mediaAssetId: z.uuid().optional(),
  status: contentStatusSchema,
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const certificateUpdateSchema = toUpdateSchema(certificateCreateSchema);

export const galleryItemCreateSchema = z.object({
  mediaAssetId: z.uuid(),
  caption: localizedSchema(shortText).optional(),
  album: z.string().trim().max(60).optional(),
  status: contentStatusSchema,
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const galleryItemUpdateSchema = toUpdateSchema(galleryItemCreateSchema);

export const publicDocumentCreateSchema = z.object({
  title: localizedSchema(title),
  description: localizedSchema(shortText).optional(),
  mediaAssetId: z.uuid(),
  status: contentStatusSchema,
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const publicDocumentUpdateSchema = toUpdateSchema(publicDocumentCreateSchema);

export const productionStepUpsertSchema = z.object({
  slug: slugSchema,
  title: localizedSchema(title),
  description: localizedSchema(shortText).optional(),
  mediaAssetId: z.uuid().optional(),
  status: contentStatusSchema,
  displayOrder: z.number().int().min(0).max(100).default(0),
});

export const homepageSectionUpsertSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9-]*$/, { message: "Bo'lim kaliti noto'g'ri" })
    .max(60),
  heading: localizedSchema(title).optional(),
  subheading: localizedSchema(shortText).optional(),
  ctaLabel: localizedSchema(z.string().trim().max(60)).optional(),
  /** Ichki yo'l yoki to'liq manzil. */
  ctaHref: z.string().trim().max(500).optional(),
  mediaAssetId: z.uuid().optional(),
  status: contentStatusSchema,
  displayOrder: z.number().int().min(0).max(100).default(0),
});

export const seoMetadataUpsertSchema = z.object({
  /** Sahifa yo'li `/` bilan boshlanishi shart. */
  path: z
    .string()
    .trim()
    .max(300)
    .regex(/^\/[a-z0-9/-]*$/, { message: "Yo'l `/` bilan boshlanishi kerak" }),
  title: localizedSchema(z.string().trim().max(70)).optional(),
  description: localizedSchema(z.string().trim().max(160)).optional(),
  ogImageId: z.uuid().optional(),
  noIndex: z.boolean().default(false),
});

export const contentListQuerySchema = paginationQuerySchema.extend({
  album: z.string().trim().max(60).optional(),
});

/** Admin ro'yxati uchun: holat bo'yicha filtr. */
export const adminContentListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CONTENT_STATUSES).optional(),
});

/**
 * Tizim sozlamasi.
 *
 * `value` — ixtiyoriy JSON: sozlamalarning shakli har xil (kontakt
 * ma'lumoti obyekt, standart til satr). Shu sababli bu yerda faqat
 * kalit va ommaviylik tekshiriladi; qiymat shaklini o'qiydigan kod
 * o'zi tekshiradi.
 *
 * `isPublic` ATAYLAB standart holatda `false`: yangi sozlama
 * tasodifan ommaviy API'ga chiqib ketmasligi kerak.
 */
export const systemSettingUpsertSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(\.[a-z0-9]+)*$/, {
      message: "Kalit `site.contact` ko'rinishida bo'lishi kerak",
    }),
  value: z.unknown(),
  description: z.string().trim().max(300).optional(),
  isPublic: z.boolean().default(false),
});
