import type { MetadataRoute } from 'next';
import { news } from '@/data/news';
import { products } from '@/data/products';
import { SITE_URL } from '@/lib/seo';

/**
 * Sitemap — barcha statik marshrutlar va `[slug]` sahifalari.
 *
 * `lastModified` uchun soxta sana YOZILMAYDI: yangiliklarning haqiqiy sanasi
 * mijozdan kelmagan (`date: null`), shuning uchun u bo'lmasa maydon tashlab ketiladi.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: '/', priority: 1 },
    { path: '/products', priority: 0.9 },
    { path: '/about', priority: 0.7 },
    { path: '/story', priority: 0.7 },
    { path: '/news', priority: 0.7 },
    { path: '/contact', priority: 0.6 },
  ].map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: 'monthly' as const,
    priority: route.priority,
  }));

  const productRoutes = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const newsRoutes = news.map((item) => ({
    url: `${SITE_URL}/news/${item.slug}`,
    changeFrequency: 'yearly' as const,
    priority: 0.5,
    ...(item.date ? { lastModified: new Date(item.date) } : {}),
  }));

  return [...staticRoutes, ...productRoutes, ...newsRoutes];
}
