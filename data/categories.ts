import type { Category } from '@/lib/types';

/**
 * VAQTINCHALIK PLACEHOLDER MA'LUMOT.
 *
 * Real kategoriya nomlari, tavsiflari va fotosuratlari mijozdan kutilmoqda
 * ([CLIENT CONTENT REQUIRED]). Quyidagilar sayt tuzilmasini ko'rsatish uchun —
 * hech qanday mahsulot da'vosi yoki ta'm nomi o'ylab topilmagan, nomlar ataylab
 * neytral ("KATEGORIYA 01"), rasmlar esa loyiha uchun chizilgan SVG maketlar.
 */
export const categories: Category[] = [
  {
    id: 'cat-01',
    slug: 'kategoriya-01',
    index: '01',
    title: { uz: 'KATEGORIYA 01', ru: 'КАТЕГОРИЯ 01', en: 'CATEGORY 01' },
    description: {
      uz: 'Vaqtinchalik matn. Kategoriya tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание категории ожидается от клиента.',
      en: 'Placeholder text. Category description pending from the client.',
    },
    image: { src: '/products/placeholder-bottle-01.svg', alt: 'Placeholder 01', width: 400, height: 720 },
    fruit: { src: '/fruits/placeholder-citrus-orange.svg', alt: '', width: 320, height: 320 },
    href: '/products',
  },
  {
    id: 'cat-02',
    slug: 'kategoriya-02',
    index: '02',
    title: { uz: 'KATEGORIYA 02', ru: 'КАТЕГОРИЯ 02', en: 'CATEGORY 02' },
    description: {
      uz: 'Vaqtinchalik matn. Kategoriya tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание категории ожидается от клиента.',
      en: 'Placeholder text. Category description pending from the client.',
    },
    image: { src: '/products/placeholder-bottle-02.svg', alt: 'Placeholder 02', width: 400, height: 720 },
    fruit: { src: '/fruits/placeholder-citrus-lime.svg', alt: '', width: 320, height: 320 },
    href: '/products',
  },
  {
    id: 'cat-03',
    slug: 'kategoriya-03',
    index: '03',
    title: { uz: 'KATEGORIYA 03', ru: 'КАТЕГОРИЯ 03', en: 'CATEGORY 03' },
    description: {
      uz: 'Vaqtinchalik matn. Kategoriya tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание категории ожидается от клиента.',
      en: 'Placeholder text. Category description pending from the client.',
    },
    image: { src: '/products/placeholder-bottle-03.svg', alt: 'Placeholder 03', width: 400, height: 720 },
    fruit: { src: '/fruits/placeholder-berries.svg', alt: '', width: 320, height: 320 },
    href: '/products',
  },
  {
    id: 'cat-04',
    slug: 'kategoriya-04',
    index: '04',
    title: { uz: 'KATEGORIYA 04', ru: 'КАТЕГОРИЯ 04', en: 'CATEGORY 04' },
    description: {
      uz: 'Vaqtinchalik matn. Kategoriya tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание категории ожидается от клиента.',
      en: 'Placeholder text. Category description pending from the client.',
    },
    image: { src: '/products/placeholder-bottle-04.svg', alt: 'Placeholder 04', width: 400, height: 720 },
    fruit: { src: '/fruits/placeholder-citrus-grapefruit.svg', alt: '', width: 320, height: 320 },
    href: '/products',
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  categories.find((category) => category.slug === slug);

export const getCategoryById = (id: string): Category | undefined =>
  categories.find((category) => category.id === id);
