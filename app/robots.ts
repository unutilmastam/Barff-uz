import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/seo';

/**
 * robots.txt
 *
 * Sayt PLACEHOLDER kontent bilan turganda indekslash TAQIQLANADI — "MAHSULOT 01"
 * va "[CLIENT CONTENT REQUIRED]" qidiruvga tushsa brendga zarar qiladi.
 * Mijoz kontenti kelgach `.env` da yoqiladi: `NEXT_PUBLIC_ALLOW_INDEXING=true`.
 */
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
