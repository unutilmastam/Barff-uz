import { type Localized } from '@barff/types';

/**
 * Ommaviy javob shakllari.
 *
 * NEGA kerak: Prisma qatorini to'g'ridan-to'g'ri qaytarish ichki
 * maydonlarni tashqariga chiqaradi — `deletedAt`, `updatedAt`,
 * `uploadedById`, obyekt saqlashdagi `key` va hokazo. Ularning
 * birortasi ham ommaviy sayt uchun kerak emas, lekin tizim ichki
 * tuzilishi haqida ma'lumot beradi.
 *
 * Shuning uchun javob ANIQ tuziladi: yangi ustun qo'shilsa, u o'z-o'zidan
 * ommaviy API'ga chiqib ketmaydi.
 */

export interface PublicImage {
  id: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  /** `[{ label, width, format, url }]` — `<picture>` uchun. */
  sources: { label: string; width: number; format: string; url: string }[];
}

export interface PublicProductVariant {
  id: string;
  sku: string;
  volumeMl: number;
  unitsPerPack: number | null;
  price: { amount: number; currency: string } | null;
}

export interface PublicProduct {
  id: string;
  slug: string;
  sku: string;
  name: Localized;
  description: Localized | null;
  ingredients: Localized | null;
  storage: Localized | null;
  flavor: Localized | null;
  shelfLifeDays: number | null;
  nutrition: unknown;
  seo: unknown;
  category: { slug: string; name: Localized } | null;
  variants: PublicProductVariant[];
  images: PublicImage[];
  documents: { id: string; title: Localized; kind: string }[];
}

/** Rasm variantlari uchun manzil quruvchi. */
export type UrlBuilder = (key: string) => string;

interface MediaRow {
  id: string;
  key: string;
  width?: number | null;
  height?: number | null;
  blurDataUrl?: string | null;
  variants?: unknown;
}

export function toPublicImage(
  media: MediaRow | null | undefined,
  url: UrlBuilder,
): PublicImage | null {
  if (media === null || media === undefined) return null;

  const raw = Array.isArray(media.variants) ? media.variants : [];

  const sources = raw
    .filter(
      (item): item is { label: string; key: string; width: number; format: string } =>
        typeof item === 'object' &&
        item !== null &&
        'key' in item &&
        'width' in item &&
        'format' in item,
    )
    // Obyekt kaliti javobga CHIQMAYDI — faqat undan manzil quriladi.
    .map((item) => ({
      label: item.label,
      width: item.width,
      format: item.format,
      url: url(item.key),
    }));

  return {
    id: media.id,
    width: media.width ?? null,
    height: media.height ?? null,
    blurDataUrl: media.blurDataUrl ?? null,
    sources,
  };
}

interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  name: unknown;
  description: unknown;
  ingredients: unknown;
  storage: unknown;
  flavor: unknown;
  shelfLifeDays: number | null;
  nutrition: unknown;
  seo: unknown;
  category?: { slug: string; name: unknown } | null;
  variants?: {
    id: string;
    sku: string;
    volumeMl: number;
    unitsPerPack: number | null;
    prices?: { amount: number; currency: string }[];
  }[];
  images?: { mediaAsset: MediaRow }[];
  documents?: { id: string; title: unknown; kind: string }[];
}

export function toPublicProduct(product: ProductRow, url: UrlBuilder): PublicProduct {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name as Localized,
    description: (product.description ?? null) as Localized | null,
    ingredients: (product.ingredients ?? null) as Localized | null,
    storage: (product.storage ?? null) as Localized | null,
    flavor: (product.flavor ?? null) as Localized | null,
    shelfLifeDays: product.shelfLifeDays,
    nutrition: product.nutrition ?? null,
    seo: product.seo ?? null,
    category:
      product.category != null
        ? { slug: product.category.slug, name: product.category.name as Localized }
        : null,
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      volumeMl: variant.volumeMl,
      unitsPerPack: variant.unitsPerPack,
      // Narx tiyinda qaytadi — mijoz uni o'zi formatlaydi.
      price:
        variant.prices?.[0] != null
          ? { amount: variant.prices[0].amount, currency: variant.prices[0].currency }
          : null,
    })),
    images: (product.images ?? [])
      .map((image) => toPublicImage(image.mediaAsset, url))
      .filter((image): image is PublicImage => image !== null),
    documents: (product.documents ?? []).map((doc) => ({
      id: doc.id,
      title: doc.title as Localized,
      kind: doc.kind,
    })),
  };
}

export interface PublicNewsSummary {
  id: string;
  slug: string;
  title: Localized;
  excerpt: Localized | null;
  publishedAt: string | null;
  coverImage: PublicImage | null;
}

export function toPublicNewsSummary(
  article: {
    id: string;
    slug: string;
    title: unknown;
    excerpt: unknown;
    publishedAt: Date | null;
    coverImage?: MediaRow | null;
  },
  url: UrlBuilder,
): PublicNewsSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title as Localized,
    excerpt: (article.excerpt ?? null) as Localized | null,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    coverImage: toPublicImage(article.coverImage, url),
  };
}

export function toPublicNewsArticle(
  article: {
    id: string;
    slug: string;
    title: unknown;
    excerpt: unknown;
    body: unknown;
    seo: unknown;
    publishedAt: Date | null;
    coverImage?: MediaRow | null;
  },
  url: UrlBuilder,
): PublicNewsSummary & { body: Localized; seo: unknown } {
  return {
    ...toPublicNewsSummary(article, url),
    body: article.body as Localized,
    seo: article.seo ?? null,
  };
}
