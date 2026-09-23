import { type Locale, type PublicNewsArticle, type PublicProduct } from '@barff/types';
import { absoluteUrl } from './seo';
import { text } from './localized';
import { siteUrl } from './site';

/**
 * Schema.org tuzilgan ma'lumotlari (CLAUDE.md §19).
 *
 * QAT'IY QOIDA: faqat TASDIQLANGAN faktlar. Reyting, sharh, narx
 * mavjudligi va shunga o'xshash "ishonch belgilari" O'YLAB
 * TOPILMAYDI — ular qidiruv natijasida yulduzcha bo'lib chiqadi va
 * bu to'g'ridan-to'g'ri yolg'on bo'lardi.
 *
 * Shu sababli bu yerda `aggregateRating` va `review` umuman yo'q, va
 * bo'sh maydon berilmaydi: qiymati yo'q kalit butunlay tushirib
 * qoldiriladi.
 */

/** `undefined` qiymatli kalitlarni olib tashlaydi. */
function compact<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

/**
 * Kompaniya.
 *
 * DIQQAT: manzil, telefon va ijtimoiy tarmoq havolalari BARFF
 * tasdiqlagandan keyin qo'shiladi (Q11) — hozir ular yo'q, chunki
 * o'ylab topilgan kontakt qidiruv natijasiga chiqib ketardi.
 */
export function organizationJsonLd(locale: Locale, description: string): Record<string, unknown> {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BARFF',
    url: absoluteUrl(locale, '/'),
    description,
    logo: `${siteUrl()}/icon.svg`,
  });
}

export function productJsonLd(product: PublicProduct, locale: Locale): Record<string, unknown> {
  const name = text(product.name, locale, product.sku);
  const description = text(product.description, locale);
  const image = product.images[0]?.sources.at(-1)?.url;

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    ...(description.length > 0 ? { description } : {}),
    sku: product.sku,
    url: absoluteUrl(locale, `/products/${product.slug}`),
    ...(image !== undefined ? { image } : {}),
    brand: { '@type': 'Brand', name: 'BARFF' },
    ...(product.category !== null ? { category: text(product.category.name, locale) } : {}),
    // Narx va mavjudlik (`offers`) ATAYLAB yo'q: ommaviy saytda narx
    // ko'rsatilmaydi, diler narxlari esa shartnomaga bog'liq. Soxta
    // `offers` qidiruvda mavjud bo'lmagan taklif ko'rsatardi.
  });
}

export function articleJsonLd(article: PublicNewsArticle, locale: Locale): Record<string, unknown> {
  const headline = text(article.title, locale, article.slug);
  const description = text(article.excerpt, locale);
  const image = article.coverImage?.sources.at(-1)?.url;

  return compact({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    ...(description.length > 0 ? { description } : {}),
    ...(article.publishedAt !== null ? { datePublished: article.publishedAt } : {}),
    ...(image !== undefined ? { image } : {}),
    mainEntityOfPage: absoluteUrl(locale, `/news/${article.slug}`),
    publisher: { '@type': 'Organization', name: 'BARFF' },
    // Muallif ismi bazada bor, lekin ommaviy javobda yo'q — shuning
    // uchun `author` yozilmaydi. Noto'g'ri muallif ko'rsatgandan
    // ko'ra umuman ko'rsatmagan yaxshi.
  });
}

/**
 * Non ushlagichlar (breadcrumb).
 *
 * Qidiruv natijasida sahifa yo'lini ko'rsatadi — bu faktik ma'lumot,
 * ya'ni o'ylab topilgan narsa emas.
 */
export function breadcrumbJsonLd(
  locale: Locale,
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}
