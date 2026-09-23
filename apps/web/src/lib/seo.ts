import { type Metadata } from 'next';
import { LOCALES, type Locale } from '@barff/types';
import { getSeo } from './content';
import { text } from './localized';
import { siteUrl } from './site';

/**
 * Sahifa metadata'sini YAGONA joyda quradi (CLAUDE.md §19).
 *
 * NEGA kerak: har bir sahifa `generateMetadata` ni o'zi yozsa,
 * kanonik manzil, hreflang, Open Graph va Twitter kartochkasi
 * sahifadan sahifaga farq qilib ketardi — va yangi sahifada
 * ularning biri unutilardi.
 *
 * Ustuvorlik: CMS'dagi yozuv sahifaning o'z matnidan USTUN turadi.
 * Ya'ni marketing sarlavhani kodga tegmasdan o'zgartira oladi.
 */
export interface PageSeoInput {
  locale: Locale;
  /** Til segmentisiz yo'l: `/products`, `/news/anor-sharbati`. */
  path: string;
  title: string;
  description?: string | undefined;
  /** Ijtimoiy tarmoq rasmi (to'liq manzil). */
  imageUrl?: string | undefined;
  /** Maqola uchun `article`, qolganlari uchun `website`. */
  type?: 'website' | 'article' | undefined;
  publishedTime?: string | undefined;
  /** `true` bo'lsa sahifa indekslanmaydi (masalan matni tayyor emas). */
  noIndex?: boolean | undefined;
  /**
   * Sarlavhaga brend qo'shimchasi QO'YILMAYDI.
   *
   * Bosh sahifa sarlavhasida "BARFF" allaqachon bor — shablon uni
   * ikkinchi marta qo'shsa, "BARFF — ... — BARFF" chiqardi.
   */
  absoluteTitle?: boolean | undefined;
}

/** Sayt qidiruvga ochiqmi. Kontent tayyor bo'lmaguncha — yo'q. */
export function indexingAllowed(): boolean {
  return process.env['NEXT_PUBLIC_ALLOW_INDEXING'] === 'true';
}

/** `/uz/products` ko'rinishidagi to'liq manzil. */
export function absoluteUrl(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path;

  return `${siteUrl()}/${locale}${clean}`;
}

export async function buildMetadata(input: PageSeoInput): Promise<Metadata> {
  // CMS yozuvi bo'lmasa sahifaning o'z matni qoladi.
  const override = await getSeo(input.locale, input.path);

  // Sarlavha HAR DOIM bo'ladi: sahifa o'zi bergani eng past zaxira.
  const title = pick(text(override?.title, input.locale), input.title) ?? input.title;
  const description = pick(text(override?.description, input.locale), input.description);
  const imageUrl = pick(override?.ogImageUrl ?? undefined, input.imageUrl);

  const canonical = absoluteUrl(input.locale, input.path);

  // Uchala til ham bir sahifaning variantlari ekanini bildiradi.
  const languages = Object.fromEntries(
    LOCALES.map((code) => [code, absoluteUrl(code, input.path)]),
  );

  const noIndex = input.noIndex === true || override?.noIndex === true || !indexingAllowed();

  return {
    title: input.absoluteTitle === true ? { absolute: title } : title,
    ...(description !== undefined ? { description } : {}),

    alternates: {
      canonical,
      languages: {
        ...languages,
        // Tili aniqlanmagan foydalanuvchi standart tilga tushadi.
        'x-default': absoluteUrl('uz', input.path),
      },
    },

    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },

    openGraph: {
      title,
      ...(description !== undefined ? { description } : {}),
      url: canonical,
      siteName: 'BARFF',
      locale: input.locale,
      type: input.type ?? 'website',
      ...(input.publishedTime !== undefined ? { publishedTime: input.publishedTime } : {}),
      ...(imageUrl !== undefined ? { images: [{ url: imageUrl }] } : {}),
    },

    twitter: {
      // Rasm bo'lsa katta kartochka, bo'lmasa oddiy matn kartochkasi —
      // bo'sh rasm maydoni bilan katta kartochka buzilgan ko'rinadi.
      card: imageUrl !== undefined ? 'summary_large_image' : 'summary',
      title,
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { images: [imageUrl] } : {}),
    },
  };
}

/** Bo'sh satr "berilmagan" degani. */
function pick(first: string | undefined, second: string | undefined): string | undefined {
  if (first !== undefined && first.trim().length > 0) return first;
  if (second !== undefined && second.trim().length > 0) return second;

  return undefined;
}
