import {
  type Locale,
  type Paginated,
  type PublicCertificate,
  type PublicDocument,
  type PublicGalleryItem,
  type PublicHomepageSection,
  type PublicNewsArticle,
  type PublicNewsSummary,
  type PublicProduct,
  type PublicProductionStep,
  type PublicSeoMetadata,
} from '@barff/types';
import { apiFetch } from './api-client';

/**
 * Ommaviy kontentni serverda o'qish.
 *
 * NEGA har bir funksiya xatoni yutadi va `null` qaytaradi: sayt
 * build paytida ham, API vaqtincha ishlamay qolganda ham ochilishi
 * kerak. Agar `fetch` xatosi yuqoriga chiqsa, butun sahifa 500 bilan
 * yiqilardi — bitta bo'lim o'rniga.
 *
 * Shuning uchun natija UCH holatni ajratadi:
 *   - massiv/obyekt — ma'lumot bor;
 *   - bo'sh massiv — ma'lumot yo'q (bo'sh holat ko'rsatiladi);
 *   - `null` — API javob bermadi (xato holati ko'rsatiladi).
 */

/**
 * Kontent kamdan-kam o'zgaradi, lekin nashr tez ko'rinishi kerak.
 *
 * Sahifalardagi `export const revalidate = 300` shu qiymat bilan bir xil.
 * U yerda o'zgaruvchi ishlatib bo'lmaydi: Next segment sozlamalarini
 * build paytida statik o'qiydi va faqat aniq sonni tushunadi.
 */
export const CONTENT_REVALIDATE_SECONDS = 300;

async function get<T>(path: string, locale: Locale): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { locale, revalidate: CONTENT_REVALIDATE_SECONDS });
  } catch (error) {
    // Sabab loglanadi (build loglarida ko'rinadi), lekin sahifa yiqilmaydi.
    console.warn(`[content] ${path} o'qilmadi:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export function getHomepageSections(locale: Locale): Promise<PublicHomepageSection[] | null> {
  return get<PublicHomepageSection[]>('/homepage-sections', locale);
}

export function getProductionSteps(locale: Locale): Promise<PublicProductionStep[] | null> {
  return get<PublicProductionStep[]>('/production-steps', locale);
}

export function getCertificates(locale: Locale): Promise<PublicCertificate[] | null> {
  return get<PublicCertificate[]>('/certificates', locale);
}

export async function getProducts(
  locale: Locale,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<PublicProduct> | null> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 24),
  });

  return get<Paginated<PublicProduct>>(`/products?${query.toString()}`, locale);
}

export function getProduct(locale: Locale, slug: string): Promise<PublicProduct | null> {
  return get<PublicProduct>(`/products/${encodeURIComponent(slug)}`, locale);
}

/** Server ro'yxat uchun eng ko'pi bilan shuncha yozuv beradi (validatsiya chegarasi). */
const MAX_PAGE_LIMIT = 100;

/** Xavfsizlik chegarasi: cheksiz aylanib qolmaslik uchun. */
const MAX_SLUG_PAGES = 20;

/**
 * Barcha mahsulot slug'lari — `generateStaticParams` uchun.
 *
 * Sahifalab o'qiladi: bitta so'rovda 100 tadan ko'p yozuv so'rash
 * server validatsiyasidan o'tmaydi (`limit` maksimumi 100), va bu
 * xato jimgina bo'sh ro'yxatga aylanardi — ya'ni hech bir mahsulot
 * sahifasi oldindan tayyorlanmasdi.
 */
export async function getAllProductSlugs(locale: Locale): Promise<string[]> {
  const slugs: string[] = [];

  for (let page = 1; page <= MAX_SLUG_PAGES; page += 1) {
    const result = await getProducts(locale, { page, limit: MAX_PAGE_LIMIT });
    if (result === null) break;

    slugs.push(...result.items.map((product) => product.slug));
    if (!result.meta.hasNextPage) break;
  }

  return slugs;
}

export async function getLatestNews(
  locale: Locale,
  limit = 3,
): Promise<Paginated<PublicNewsSummary> | null> {
  return get<Paginated<PublicNewsSummary>>(`/news?page=1&limit=${limit}`, locale);
}

export function getNews(
  locale: Locale,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<PublicNewsSummary> | null> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 12),
  });

  return get<Paginated<PublicNewsSummary>>(`/news?${query.toString()}`, locale);
}

export function getNewsArticle(locale: Locale, slug: string): Promise<PublicNewsArticle | null> {
  return get<PublicNewsArticle>(`/news/${encodeURIComponent(slug)}`, locale);
}

export function getGallery(locale: Locale, album?: string): Promise<PublicGalleryItem[] | null> {
  const suffix = album !== undefined ? `?album=${encodeURIComponent(album)}` : '';

  return get<PublicGalleryItem[]>(`/gallery${suffix}`, locale);
}

export function getDocuments(locale: Locale): Promise<PublicDocument[] | null> {
  return get<PublicDocument[]>('/documents', locale);
}

/**
 * Ommaviy sozlamalar: `{ 'site.contact': {...}, ... }`.
 *
 * Shakl sozlamaga qarab har xil, shuning uchun `unknown` qaytadi va
 * o'qiydigan kod o'zi tekshiradi — noto'g'ri shakl sahifani yiqitmasligi
 * kerak.
 */
export function getPublicSettings(locale: Locale): Promise<Record<string, unknown> | null> {
  return get<Record<string, unknown>>('/settings', locale);
}

/** Barcha yangilik slug'lari — `generateStaticParams` uchun. */
export async function getAllNewsSlugs(locale: Locale): Promise<string[]> {
  const slugs: string[] = [];

  for (let page = 1; page <= MAX_SLUG_PAGES; page += 1) {
    const result = await getNews(locale, { page, limit: MAX_PAGE_LIMIT });
    if (result === null) break;

    slugs.push(...result.items.map((article) => article.slug));
    if (!result.meta.hasNextPage) break;
  }

  return slugs;
}

/**
 * Sahifaning CMS'dagi SEO ma'lumoti.
 *
 * Yozuv bo'lmasa `null` qaytadi — bu XATO EMAS, shunchaki sahifa uchun
 * alohida sozlama kiritilmagan degani va sahifaning o'z matni
 * ishlatiladi.
 */
export function getSeo(locale: Locale, path: string): Promise<PublicSeoMetadata | null> {
  return get<PublicSeoMetadata>(`/seo?path=${encodeURIComponent(path)}`, locale);
}
