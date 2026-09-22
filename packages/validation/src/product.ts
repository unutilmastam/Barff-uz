import { z } from 'zod';
import { localizedSchema, paginationQuerySchema } from './primitives';
import { toUpdateSchema } from './update-schema';

/**
 * Mahsulot sxemalari.
 *
 * Bu yerdagi qoidalar admin CMS formasida ham, API'da ham AYNAN bir xil
 * ishlaydi — shuning uchun forma o'tkazgan ma'lumot serverda rad etilib
 * qolmaydi va aksincha.
 */

const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(5000);

/**
 * Slug — ommaviy URL qismi.
 *
 * Faqat kichik harf, raqam va defis. Bosh/oxirgi defis va ketma-ket
 * defislar taqiqlangan: ular bir xil sahifaga bir nechta manzil
 * yaratib, SEO'da takroriy kontent muammosini keltirib chiqaradi.
 */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, { message: 'Slug juda qisqa' })
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug faqat kichik harf, raqam va defisdan iborat bo'lishi kerak",
  });

/** SKU — ichki artikul. Bo'sh joy bo'lmaydi. */
export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, {
    message: "SKU faqat harf, raqam, defis va pastki chiziqdan iborat bo'lishi kerak",
  });

/** EAN-8, EAN-13 yoki UPC-A. */
export const barcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$|^\d{12,13}$/, {
    message: "Shtrix-kod 8, 12 yoki 13 raqamdan iborat bo'lishi kerak",
  });

/** 100 ml uchun ozuqaviy qiymat. */
export const nutritionSchema = z.object({
  energyKcal: z.number().min(0).max(1000).optional(),
  proteinG: z.number().min(0).max(100).optional(),
  carbsG: z.number().min(0).max(100).optional(),
  sugarG: z.number().min(0).max(100).optional(),
  fatG: z.number().min(0).max(100).optional(),
});

export const seoSchema = z.object({
  title: localizedSchema(z.string().trim().max(70)).optional(),
  description: localizedSchema(z.string().trim().max(160)).optional(),
});

export const productCategoryCreateSchema = z.object({
  slug: slugSchema,
  name: localizedSchema(shortText),
  description: localizedSchema(longText).optional(),
  parentId: z.uuid().optional(),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
  seo: seoSchema.optional(),
});

export const productCategoryUpdateSchema = toUpdateSchema(productCategoryCreateSchema);

export const productCreateSchema = z.object({
  slug: slugSchema,
  sku: skuSchema,
  categoryId: z.uuid(),
  name: localizedSchema(shortText),
  description: localizedSchema(longText).optional(),
  ingredients: localizedSchema(longText).optional(),
  storage: localizedSchema(longText).optional(),
  flavor: localizedSchema(shortText).optional(),
  /** Yaroqlilik muddati — kunda. 10 yildan uzun muddat xato bo'lishi aniq. */
  shelfLifeDays: z.number().int().min(1).max(3650).optional(),
  nutrition: nutritionSchema.optional(),
  seo: seoSchema.optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const productUpdateSchema = toUpdateSchema(productCreateSchema);

export const productVariantCreateSchema = z.object({
  sku: skuSchema,
  barcode: barcodeSchema.optional(),
  /** Hajm millilitrda: 0.5 l -> 500. Butun son. */
  volumeMl: z.number().int().min(1).max(100_000),
  unitsPerPack: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const productVariantUpdateSchema = toUpdateSchema(productVariantCreateSchema);

/**
 * Narx.
 *
 * `amount` — BUTUN son, eng kichik birlikda (tiyin). Suzuvchi nuqta
 * qabul qilinmaydi: `12.30` kabi qiymatlar yig'indida xato to'playdi.
 */
export const productPriceCreateSchema = z.object({
  amount: z
    .number()
    .int({ message: 'Narx butun songa (tiyinda) keltirilishi kerak' })
    .min(0)
    .max(1_000_000_000_000),
  currency: z.string().trim().toUpperCase().length(3).default('UZS'),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});

/** Ommaviy ro'yxat so'rovi. */
export const productListQuerySchema = paginationQuerySchema.extend({
  categorySlug: slugSchema.optional(),
  /** Nomi bo'yicha qidirish. */
  search: z.string().trim().min(2).max(100).optional(),
});

export type ProductCreateInput = z.input<typeof productCreateSchema>;
export type ProductCreateOutput = z.output<typeof productCreateSchema>;
export type ProductVariantCreateInput = z.input<typeof productVariantCreateSchema>;
export type ProductCategoryCreateInput = z.input<typeof productCategoryCreateSchema>;
