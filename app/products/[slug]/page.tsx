import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetails } from '@/components/products/ProductDetails';
import { getProductBySlug, products } from '@/data/products';

/** Barcha mahsulot sahifalari build paytida statik generatsiya qilinadi. */
export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  // To'liq SEO metadata Phase 10 da yoziladi.
  return { title: product ? `BARFF — ${product.name.uz}` : 'BARFF' };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  // Mavjud bo'lmagan slug → `not-found.tsx` (PRODUCT NOT FOUND).
  if (!product) notFound();

  return <ProductDetails product={product} />;
}
