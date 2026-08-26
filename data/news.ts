import type { NewsItem } from '@/lib/types';

/**
 * VAQTINCHALIK PLACEHOLDER MA'LUMOT.
 *
 * Yangilik sarlavhalari neytral ("YANGILIK 01"), matnlar vaqtinchalik.
 * SANALAR o'ylab topilmaydi: `date: null` → interfeysda `[CLIENT CONTENT REQUIRED]`.
 * [CLIENT CONTENT REQUIRED] — yangiliklar matni, sanalari va rasmlari.
 */
export const news: NewsItem[] = [
  {
    id: 'news-01',
    slug: 'yangilik-01',
    title: { uz: 'YANGILIK 01', ru: 'НОВОСТЬ 01', en: 'NEWS 01' },
    excerpt: {
      uz: 'Vaqtinchalik matn. Yangilik matni mijozdan kutilmoqda.',
      ru: 'Временный текст. Текст новости ожидается от клиента.',
      en: 'Placeholder text. Article copy pending from the client.',
    },
    // SANA O'YLAB TOPILMAYDI — mijoz bergach to'ldiriladi.
    date: null,
    image: {
      src: '/products/placeholder-bottle-01.svg',
      alt: 'BARFF placeholder 01',
      width: 400,
      height: 720,
    },
  },
  {
    id: 'news-02',
    slug: 'yangilik-02',
    title: { uz: 'YANGILIK 02', ru: 'НОВОСТЬ 02', en: 'NEWS 02' },
    excerpt: {
      uz: 'Vaqtinchalik matn. Yangilik matni mijozdan kutilmoqda.',
      ru: 'Временный текст. Текст новости ожидается от клиента.',
      en: 'Placeholder text. Article copy pending from the client.',
    },
    // SANA O'YLAB TOPILMAYDI — mijoz bergach to'ldiriladi.
    date: null,
    image: {
      src: '/products/placeholder-bottle-02.svg',
      alt: 'BARFF placeholder 02',
      width: 400,
      height: 720,
    },
  },
  {
    id: 'news-03',
    slug: 'yangilik-03',
    title: { uz: 'YANGILIK 03', ru: 'НОВОСТЬ 03', en: 'NEWS 03' },
    excerpt: {
      uz: 'Vaqtinchalik matn. Yangilik matni mijozdan kutilmoqda.',
      ru: 'Временный текст. Текст новости ожидается от клиента.',
      en: 'Placeholder text. Article copy pending from the client.',
    },
    // SANA O'YLAB TOPILMAYDI — mijoz bergach to'ldiriladi.
    date: null,
    image: {
      src: '/products/placeholder-bottle-03.svg',
      alt: 'BARFF placeholder 03',
      width: 400,
      height: 720,
    },
  },
];

export const getNewsBySlug = (slug: string): NewsItem | undefined =>
  news.find((item) => item.slug === slug);

/** Eng yangisi birinchi. Sanasi yo'q yozuvlar oxirida qoladi. */
export const getSortedNews = (): NewsItem[] =>
  [...news].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
