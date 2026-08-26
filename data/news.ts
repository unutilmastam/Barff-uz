import type { NewsItem } from '@/lib/types';

/**
 * [CLIENT CONTENT REQUIRED]
 * Yangiliklar matni va rasmlari mijozdan kutilmoqda.
 */
export const news: NewsItem[] = [];

export const getNewsBySlug = (slug: string): NewsItem | undefined =>
  news.find((item) => item.slug === slug);

/** Eng yangisi birinchi. */
export const getSortedNews = (): NewsItem[] =>
  [...news].sort((a, b) => b.date.localeCompare(a.date));
