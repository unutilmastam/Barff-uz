import {
  type Localized,
  type PublicCertificate,
  type PublicDocument,
  type PublicFile,
  type PublicGalleryItem,
  type PublicHomepageSection,
  type PublicImage,
  type PublicNewsArticle,
  type PublicNewsSummary,
  type PublicProduct,
  type PublicProductionStep,
  type PublicSeoMetadata,
} from '@barff/types';

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
 *
 * Shakllarning o'zi `@barff/types` ichida — API bilan web bitta tipni
 * baham ko'radi, shuning uchun server javobni o'zgartirsa mijoz
 * kompilyatsiyada yiqiladi, ishga tushganda emas.
 */

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

interface FileRow {
  id: string;
  key: string;
  mimeType: string;
  byteSize?: number | null;
}

/** PDF/rasm hujjatlari uchun: kalit emas, tayyor manzil qaytadi. */
export function toPublicFile(file: FileRow | null | undefined, url: UrlBuilder): PublicFile | null {
  if (file === null || file === undefined) return null;

  return {
    id: file.id,
    mimeType: file.mimeType,
    byteSize: file.byteSize ?? null,
    url: url(file.key),
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
): PublicNewsArticle {
  return {
    ...toPublicNewsSummary(article, url),
    body: article.body as Localized,
    seo: article.seo ?? null,
  };
}

export function toPublicCertificate(
  row: {
    id: string;
    title: unknown;
    description: unknown;
    issuer: string | null;
    number: string | null;
    issuedAt: Date | null;
    expiresAt: Date | null;
    mediaAsset?: FileRow | null;
  },
  url: UrlBuilder,
): PublicCertificate {
  return {
    id: row.id,
    title: row.title as Localized,
    description: (row.description ?? null) as Localized | null,
    issuer: row.issuer,
    number: row.number,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    file: toPublicFile(row.mediaAsset, url),
  };
}

export function toPublicDocument(
  row: {
    id: string;
    title: unknown;
    description: unknown;
    mediaAsset: FileRow;
  },
  url: UrlBuilder,
): PublicDocument {
  return {
    id: row.id,
    title: row.title as Localized,
    description: (row.description ?? null) as Localized | null,
    // Hujjatda fayl har doim bor (sxemada majburiy bog'lanish).
    file: toPublicFile(row.mediaAsset, url) as PublicFile,
  };
}

export function toPublicGalleryItem(
  row: {
    id: string;
    caption: unknown;
    album: string | null;
    mediaAsset?: MediaRow | null;
  },
  url: UrlBuilder,
): PublicGalleryItem {
  return {
    id: row.id,
    caption: (row.caption ?? null) as Localized | null,
    album: row.album,
    image: toPublicImage(row.mediaAsset, url),
  };
}

export function toPublicProductionStep(
  row: {
    id: string;
    slug: string;
    title: unknown;
    description: unknown;
    displayOrder: number;
    mediaAsset?: MediaRow | null;
  },
  url: UrlBuilder,
): PublicProductionStep {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as Localized,
    description: (row.description ?? null) as Localized | null,
    displayOrder: row.displayOrder,
    image: toPublicImage(row.mediaAsset, url),
  };
}

export function toPublicHomepageSection(
  row: {
    id: string;
    key: string;
    heading: unknown;
    subheading: unknown;
    ctaLabel: unknown;
    ctaHref: string | null;
    displayOrder: number;
    mediaAsset?: MediaRow | null;
  },
  url: UrlBuilder,
): PublicHomepageSection {
  return {
    id: row.id,
    key: row.key,
    heading: (row.heading ?? null) as Localized | null,
    subheading: (row.subheading ?? null) as Localized | null,
    ctaLabel: (row.ctaLabel ?? null) as Localized | null,
    ctaHref: row.ctaHref,
    displayOrder: row.displayOrder,
    image: toPublicImage(row.mediaAsset, url),
  };
}

export function toPublicSeo(
  row: {
    path: string;
    title: unknown;
    description: unknown;
    noIndex: boolean;
    ogImage?: { key: string } | null;
  },
  url: UrlBuilder,
): PublicSeoMetadata {
  return {
    path: row.path,
    title: (row.title ?? null) as Localized | null,
    description: (row.description ?? null) as Localized | null,
    ogImageUrl: row.ogImage != null ? url(row.ogImage.key) : null,
    noIndex: row.noIndex,
  };
}
