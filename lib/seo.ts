import type { Metadata } from 'next';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

/**
 * SEO uchun umumiy sozlamalar.
 *
 * DIQQAT — INDEKSLASH: sayt hozircha PLACEHOLDER kontent bilan to'ldirilgan
 * ("MAHSULOT 01", "[CLIENT CONTENT REQUIRED]"). Bunday sahifalar qidiruvga tushsa
 * brendga ZARAR qiladi. Shu sababli indekslash STANDART HOLATDA O'CHIQ.
 *
 * Ishga tushirish payti mijoz kontenti kelgach `.env` da yoqiladi:
 *   NEXT_PUBLIC_ALLOW_INDEXING=true
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

/** Saytning kanonik manzili. `CNAME` faylidagi domen. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barff.uz').replace(/\/$/, '');

export const SITE_NAME = 'BARFF';

/** `<html lang>` bilan bir xil — metadata server'da standart tilda render qilinadi. */
export const METADATA_LOCALE: Locale = DEFAULT_LOCALE;

export const OG_IMAGE = {
  url: '/images/og-default.jpg',
  width: 1200,
  height: 630,
};

/** To'liq URL yasaydi (canonical va structured data uchun). */
export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

interface PageMetaOptions {
  title: string;
  description: string;
  /** Sahifa yo'li: `/products`, `/news/yangilik-01` … */
  path: string;
  /** Sahifaga xos OG rasm; berilmasa standart rasm ishlatiladi. */
  image?: string;
  /** Maqola sahifalari uchun. */
  type?: 'website' | 'article';
  publishedTime?: string | null;
}

/**
 * Sahifa metadata'sini yasaydi: canonical + OpenGraph + Twitter card.
 * Har sahifada takrorlanadigan bo'limlar shu yerda bir joyda turadi.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = OG_IMAGE.url,
  type = 'website',
  publishedTime,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: METADATA_LOCALE,
      images: [{ url: image, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
