import { type MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * `robots.txt`.
 *
 * Indekslash `NEXT_PUBLIC_ALLOW_INDEXING` bilan boshqariladi — sahifa
 * metadata'sidagi qoida bilan BIR XIL manba. Kontent tayyor bo'lmaguncha
 * sayt qidiruvga tushmasligi kerak (CLAUDE.md §19), shuning uchun
 * standart holat — taqiq.
 */
export default function robots(): MetadataRoute.Robots {
  const allowed = process.env['NEXT_PUBLIC_ALLOW_INDEXING'] === 'true';

  return {
    rules: allowed
      ? // Ichki ko'rish sahifalari indekslanmaydi.
        { userAgent: '*', allow: '/', disallow: ['/api/', '/*/dev/'] }
      : { userAgent: '*', disallow: '/' },
    ...(allowed ? { sitemap: `${siteUrl()}/sitemap.xml` } : {}),
  };
}
