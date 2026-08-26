import { socialLinks } from '@/data/social';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';
import type { Product } from '@/lib/types';

/**
 * Structured data (JSON-LD).
 *
 * KONTENT QOIDASI: bu yerga faqat TASDIQLANGAN ma'lumot yoziladi. Narx, mavjudlik,
 * reyting, manzil, telefon — bularning hech biri ma'lum emas, shuning uchun
 * strukturaviy ma'lumotga ham QO'SHILMAYDI. Noto'g'ri structured data uchun
 * qidiruv tizimlari sahifani jazolaydi.
 */
function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Ma'lumot bizning `data/` fayllarimizdan — tashqi kirish emas.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization — butun sayt uchun bir marta (root layout). */
export function OrganizationJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/images/og-default.jpg'),
        // Faqat MAVJUD va tasdiqlangan havolalar.
        sameAs: socialLinks.map((link) => link.href),
      }}
    />
  );
}

/** Breadcrumb — foydalanuvchi qayerda turganini qidiruv tizimiga bildiradi. */
export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; path: string }> }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

/** Product — narx va mavjudlik YO'Q (ular ma'lum emas). */
export function ProductJsonLd({ product }: { product: Product }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name.uz,
        description: product.description.uz,
        brand: { '@type': 'Brand', name: SITE_NAME },
        url: absoluteUrl(`/products/${product.slug}`),
        ...(product.image ? { image: absoluteUrl(product.image.src) } : {}),
      }}
    />
  );
}

/** Article — sana bo'lmasa `datePublished` umuman yozilmaydi. */
export function ArticleJsonLd({
  headline,
  description,
  path,
  image,
  datePublished,
}: {
  headline: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string | null;
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        mainEntityOfPage: absoluteUrl(path),
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        ...(image ? { image: absoluteUrl(image) } : {}),
        ...(datePublished ? { datePublished } : {}),
      }}
    />
  );
}
