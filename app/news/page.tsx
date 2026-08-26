import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { NewsPage } from '@/components/news/NewsPage';

export const metadata: Metadata = pageMetadata({
  title: 'Yangiliklar',
  description:
    "BARFF yangiliklari. Kontent vaqtinchalik — maqolalar va sanalar mijozdan kutilmoqda.",
  path: '/news',
});

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'BARFF', path: '/' }, { name: 'Yangiliklar', path: '/news' }]} />
      <NewsPage />
    </>
  );
}
