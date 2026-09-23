import { type Localized } from './common';

/**
 * Ommaviy API javob shakllari.
 *
 * Bu tiplar API va web ilovasi O'RTASIDAGI shartnoma. Ular shu yerda
 * turgani uchun server javobni o'zgartirsa, mijoz tomonda kompilyatsiya
 * xatosi chiqadi — mos kelmaslik ishga tushirilganda emas, qurishda
 * ko'rinadi.
 */

export interface PublicImageSource {
  label: string;
  width: number;
  format: string;
  url: string;
}

export interface PublicImage {
  id: string;
  width: number | null;
  height: number | null;
  /** Rasm yuklangunicha ko'rsatiladigan kichik o'rindosh. */
  blurDataUrl: string | null;
  sources: PublicImageSource[];
}

export interface PublicPrice {
  /** Eng kichik birlikda (tiyin). Mijoz uni o'zi formatlaydi. */
  amount: number;
  currency: string;
}

export interface PublicProductVariant {
  id: string;
  sku: string;
  volumeMl: number;
  unitsPerPack: number | null;
  price: PublicPrice | null;
}

export interface PublicProductDocument {
  id: string;
  title: Localized;
  kind: string;
}

export interface PublicProductCategory {
  slug: string;
  name: Localized;
  description?: Localized | null;
  parentId?: string | null;
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
  category: Pick<PublicProductCategory, 'slug' | 'name'> | null;
  variants: PublicProductVariant[];
  images: PublicImage[];
  documents: PublicProductDocument[];
}

export interface PublicNewsSummary {
  id: string;
  slug: string;
  title: Localized;
  excerpt: Localized | null;
  publishedAt: string | null;
  coverImage: PublicImage | null;
}

export interface PublicNewsArticle extends PublicNewsSummary {
  body: Localized;
  seo: unknown;
}

/** Yuklab olish/ko'rish uchun tayyor fayl. Obyekt kaliti javobga chiqmaydi. */
export interface PublicFile {
  id: string;
  mimeType: string;
  byteSize: number | null;
  url: string;
}

export interface PublicCertificate {
  id: string;
  title: Localized;
  description: Localized | null;
  issuer: string | null;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  file: PublicFile | null;
}

export interface PublicDocument {
  id: string;
  title: Localized;
  description: Localized | null;
  file: PublicFile;
}

export interface PublicGalleryItem {
  id: string;
  caption: Localized | null;
  album: string | null;
  image: PublicImage | null;
}

export interface PublicProductionStep {
  id: string;
  slug: string;
  title: Localized;
  description: Localized | null;
  displayOrder: number;
  image: PublicImage | null;
}

export interface PublicHomepageSection {
  id: string;
  key: string;
  heading: Localized | null;
  subheading: Localized | null;
  ctaLabel: Localized | null;
  ctaHref: string | null;
  displayOrder: number;
  image: PublicImage | null;
}

export interface PublicSeoMetadata {
  path: string;
  title: Localized | null;
  description: Localized | null;
  ogImageUrl: string | null;
  noIndex: boolean;
}
