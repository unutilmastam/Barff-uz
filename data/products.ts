import type { Product } from '@/lib/types';

/**
 * VAQTINCHALIK PLACEHOLDER MA'LUMOT.
 *
 * Real mahsulot nomlari, ta'mlar, ta'rkib, kaloriya va fotosuratlar mijozdan
 * kutilmoqda ([CLIENT CONTENT REQUIRED]).
 *
 * Bu yerda hech qanday BARFF ma'lumoti O'YLAB TOPILMAGAN:
 *   - nomlar ataylab neytral ("MAHSULOT 01"), ta'm nomlari yozilmagan;
 *   - `ingredients`, `nutrition`, `packaging` BO'SH — ular mahsulot da'volari;
 *   - rasmlar loyiha uchun chizilgan SVG maketlar (`public/products`, `public/fruits`),
 *     yorlig'ida "PLACEHOLDER" yozuvi bor; boshqa saytdan asset ko'chirilmagan;
 *   - `color` — vaqtinchalik ranglar, brend palitrasi emas.
 *
 * Real kontent kelgach faqat shu fayl almashtiriladi — komponentlar o'zgarmaydi.
 */
export const products: Product[] = [
  {
    id: 'prod-01',
    slug: 'mahsulot-01',
    name: { uz: 'MAHSULOT 01', ru: 'ПРОДУКТ 01', en: 'PRODUCT 01' },
    tagline: {
      uz: 'Vaqtinchalik tagline',
      ru: 'Временный тэглайн',
      en: 'Placeholder tagline',
    },
    description: {
      uz: 'Vaqtinchalik matn. Mahsulot tavsifi, tarkibi va ozuqaviy qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание, состав и пищевая ценность ожидаются от клиента.',
      en: 'Placeholder text. Description, ingredients and nutrition pending from the client.',
    },
    categoryId: 'cat-01',
    image: {
      src: '/products/placeholder-bottle-01.svg',
      alt: 'BARFF placeholder 01',
      width: 400,
      height: 720,
    },
    fruits: [
      { src: '/fruits/placeholder-citrus-orange.svg', alt: '', width: 320, height: 320 },
      { src: '/fruits/placeholder-leaf.svg', alt: '', width: 320, height: 320 },
    ],
    color: '#F4761F',
    // ta'rkib / kaloriya / qadoq — DA'VOLAR. Mijoz tasdiqlamaguncha bo'sh qoladi.
    ingredients: [],
    nutrition: [],
    packaging: [],
    relatedIds: ['prod-02', 'prod-03'],
    featured: true,
  },
  {
    id: 'prod-02',
    slug: 'mahsulot-02',
    name: { uz: 'MAHSULOT 02', ru: 'ПРОДУКТ 02', en: 'PRODUCT 02' },
    tagline: {
      uz: 'Vaqtinchalik tagline',
      ru: 'Временный тэглайн',
      en: 'Placeholder tagline',
    },
    description: {
      uz: 'Vaqtinchalik matn. Mahsulot tavsifi, tarkibi va ozuqaviy qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание, состав и пищевая ценность ожидаются от клиента.',
      en: 'Placeholder text. Description, ingredients and nutrition pending from the client.',
    },
    categoryId: 'cat-02',
    image: {
      src: '/products/placeholder-bottle-02.svg',
      alt: 'BARFF placeholder 02',
      width: 400,
      height: 720,
    },
    fruits: [
      { src: '/fruits/placeholder-citrus-lime.svg', alt: '', width: 320, height: 320 },
      { src: '/fruits/placeholder-apple.svg', alt: '', width: 320, height: 320 },
    ],
    color: '#5FB92E',
    // ta'rkib / kaloriya / qadoq — DA'VOLAR. Mijoz tasdiqlamaguncha bo'sh qoladi.
    ingredients: [],
    nutrition: [],
    packaging: [],
    relatedIds: ['prod-01', 'prod-04'],
    featured: true,
  },
  {
    id: 'prod-03',
    slug: 'mahsulot-03',
    name: { uz: 'MAHSULOT 03', ru: 'ПРОДУКТ 03', en: 'PRODUCT 03' },
    tagline: {
      uz: 'Vaqtinchalik tagline',
      ru: 'Временный тэглайн',
      en: 'Placeholder tagline',
    },
    description: {
      uz: 'Vaqtinchalik matn. Mahsulot tavsifi, tarkibi va ozuqaviy qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание, состав и пищевая ценность ожидаются от клиента.',
      en: 'Placeholder text. Description, ingredients and nutrition pending from the client.',
    },
    categoryId: 'cat-03',
    image: {
      src: '/products/placeholder-bottle-03.svg',
      alt: 'BARFF placeholder 03',
      width: 400,
      height: 720,
    },
    fruits: [
      { src: '/fruits/placeholder-berries.svg', alt: '', width: 320, height: 320 },
      { src: '/fruits/placeholder-citrus-grapefruit.svg', alt: '', width: 320, height: 320 },
    ],
    color: '#E8446E',
    // ta'rkib / kaloriya / qadoq — DA'VOLAR. Mijoz tasdiqlamaguncha bo'sh qoladi.
    ingredients: [],
    nutrition: [],
    packaging: [],
    relatedIds: ['prod-01', 'prod-04'],
    featured: true,
  },
  {
    id: 'prod-04',
    slug: 'mahsulot-04',
    name: { uz: 'MAHSULOT 04', ru: 'ПРОДУКТ 04', en: 'PRODUCT 04' },
    tagline: {
      uz: 'Vaqtinchalik tagline',
      ru: 'Временный тэглайн',
      en: 'Placeholder tagline',
    },
    description: {
      uz: 'Vaqtinchalik matn. Mahsulot tavsifi, tarkibi va ozuqaviy qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание, состав и пищевая ценность ожидаются от клиента.',
      en: 'Placeholder text. Description, ingredients and nutrition pending from the client.',
    },
    categoryId: 'cat-04',
    image: {
      src: '/products/placeholder-bottle-04.svg',
      alt: 'BARFF placeholder 04',
      width: 400,
      height: 720,
    },
    fruits: [
      { src: '/fruits/placeholder-peach.svg', alt: '', width: 320, height: 320 },
      { src: '/fruits/placeholder-leaf.svg', alt: '', width: 320, height: 320 },
    ],
    color: '#3E9BD8',
    // ta'rkib / kaloriya / qadoq — DA'VOLAR. Mijoz tasdiqlamaguncha bo'sh qoladi.
    ingredients: [],
    nutrition: [],
    packaging: [],
    relatedIds: ['prod-02', 'prod-03'],
    featured: true,
  },
];

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
