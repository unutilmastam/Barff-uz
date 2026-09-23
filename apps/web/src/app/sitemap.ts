import { type MetadataRoute } from 'next';
import { LOCALES } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { allPaths } from '@/lib/navigation';
import { getAllNewsSlugs, getAllProductSlugs } from '@/lib/content';
import { siteUrl } from '@/lib/site';

/**
 * `sitemap.xml`.
 *
 * Statik sahifalar `navigation.ts` dan keladi — sarlavha, pastki qism
 * va sitemap bitta ro'yxatni baham ko'radi, shuning uchun yangi sahifa
 * qo'shilganda sitemap unutilmaydi.
 *
 * Mahsulot va yangilik sahifalari API'dan olinadi. API javob bermasa
 * ro'yxat faqat statik sahifalar bilan chiqadi — sitemap'ning yo'qligi
 * qisman sitemap'dan yomonroq.
 *
 * Har bir yo'l uchun `alternates.languages` beriladi: qidiruv tizimi
 * uchala tilni BIR sahifaning variantlari deb biladi (CLAUDE.md §19).
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const messages = await getMessages('uz');

  const [productSlugs, newsSlugs] = await Promise.all([
    getAllProductSlugs('uz'),
    getAllNewsSlugs('uz'),
  ]);

  // Til segmentisiz yo'llar: `/products`, `/news/xxx`, ...
  const paths = [
    ...allPaths('uz', messages).map(stripLocale),
    ...productSlugs.map((slug) => `/products/${slug}`),
    ...newsSlugs.map((slug) => `/news/${slug}`),
  ];

  const now = new Date();

  return paths.map((path) => ({
    url: `${base}/uz${path}`,
    lastModified: now,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `${base}/${locale}${path}`])),
    },
  }));
}

/** `/uz/products` -> `/products`; `/uz` -> ``. */
function stripLocale(path: string): string {
  const withoutLocale = path.replace(/^\/[a-z]{2}/, '');

  return withoutLocale;
}
