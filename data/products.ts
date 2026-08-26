import type { Product } from '@/lib/types';

/**
 * [CLIENT CONTENT REQUIRED]
 * Real mahsulot nomlari, ta'rif, ta'rkib, kaloriya va fotosuratlar mijozdan kutilmoqda.
 * Hech qanday mahsulot o'ylab topilmaydi (BUILD_PLAN 8-qoida).
 */
export const products: Product[] = [];

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((product) => product.slug === slug);

export const getProductsByCategory = (categoryId: string): Product[] =>
  products.filter((product) => product.categoryId === categoryId);

export const getFeaturedProducts = (): Product[] =>
  products.filter((product) => product.featured);

export const getRelatedProducts = (product: Product): Product[] =>
  (product.relatedIds ?? [])
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item));
