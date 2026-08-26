import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { ProductsPage } from '@/components/products/ProductsPage';

export const metadata: Metadata = pageMetadata({
  title: 'Mahsulotlar',
  description:
    "BARFF mahsulotlari. Kontent vaqtinchalik — real mahsulot nomlari va tavsiflari mijozdan kutilmoqda.",
  path: '/products',
});

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'BARFF', path: '/' }, { name: 'Mahsulotlar', path: '/products' }]} />
      <ProductsPage />
    </>
  );
}
