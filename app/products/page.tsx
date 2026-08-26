import type { Metadata } from 'next';
import { ProductsPage } from '@/components/products/ProductsPage';

export const metadata: Metadata = {
  // To'liq SEO metadata Phase 10 da yoziladi.
  title: 'BARFF — Products',
};

export default function Page() {
  return <ProductsPage />;
}
