import type { Category } from '@/lib/types';

/**
 * [CLIENT CONTENT REQUIRED]
 * Real kategoriyalar ro'yxati mijozdan kutilmoqda.
 */
export const categories: Category[] = [];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  categories.find((category) => category.slug === slug);

export const getCategoryById = (id: string): Category | undefined =>
  categories.find((category) => category.id === id);
