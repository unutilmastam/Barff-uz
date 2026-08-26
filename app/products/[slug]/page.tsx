import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetails } from '@/components/products/ProductDetails';
import { BreadcrumbJsonLd, ProductJsonLd } from '@/components/seo/JsonLd';
import { getProductBySlug, products } from '@/data/products';
import { METADATA_LOCALE, pageMetadata } from '@/lib/seo';

/** Barcha mahsulot sahifalari build paytida statik generatsiya qilinadi. */
export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

/** Har mahsulotning OG rasmi alohida (`og-product-01.jpg` …). */
const ogImage = (slug: string) => {
  const index = slug.match(/(\d+)$/)?.[1];
  return index ? `/images/og-product-${index}.jpg` : undefined;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) return { title: 'Mahsulot topilmadi' };

  return pageMetadata({
    title: product.name[METADATA_LOCALE],
    description: product.description[METADATA_LOCALE],
    path: `/products/${product.slug}`,
    image: ogImage(product.slug),
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  // Mavjud bo'lmagan slug → `not-found.tsx` (PRODUCT NOT FOUND).
  if (!product) notFound();

  return (
    <>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: 'BARFF', path: '/' },
          { name: 'Mahsulotlar', path: '/products' },
          { name: product.name[METADATA_LOCALE], path: `/products/${product.slug}` },
        ]}
      />
      <ProductDetails product={product} />
    </>
  );
}
