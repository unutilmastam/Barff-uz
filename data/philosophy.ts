import type { Value } from '@/lib/types';

/**
 * VAQTINCHALIK PLACEHOLDER MA'LUMOT.
 *
 * Brend qiymatlari — bu BRENDNING DA'VOLARI. Ular o'ylab topilmaydi (8-qoida):
 * nomlar neytral ("QIYMAT 01"), tavsiflar esa aniq belgilangan vaqtinchalik matn.
 * [CLIENT CONTENT REQUIRED] — 4 ta qiymat nomi va tavsifi.
 */
export const values: Value[] = [
  {
    id: 'value-01',
    index: '01',
    title: { uz: 'QIYMAT 01', ru: 'ЦЕННОСТЬ 01', en: 'VALUE 01' },
    description: {
      uz: 'Vaqtinchalik matn. Brend qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Ценность бренда ожидается от клиента.',
      en: 'Placeholder text. Brand value pending from the client.',
    },
    image: { src: '/fruits/placeholder-citrus-orange.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'value-02',
    index: '02',
    title: { uz: 'QIYMAT 02', ru: 'ЦЕННОСТЬ 02', en: 'VALUE 02' },
    description: {
      uz: 'Vaqtinchalik matn. Brend qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Ценность бренда ожидается от клиента.',
      en: 'Placeholder text. Brand value pending from the client.',
    },
    image: { src: '/fruits/placeholder-citrus-lime.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'value-03',
    index: '03',
    title: { uz: 'QIYMAT 03', ru: 'ЦЕННОСТЬ 03', en: 'VALUE 03' },
    description: {
      uz: 'Vaqtinchalik matn. Brend qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Ценность бренда ожидается от клиента.',
      en: 'Placeholder text. Brand value pending from the client.',
    },
    image: { src: '/fruits/placeholder-berries.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'value-04',
    index: '04',
    title: { uz: 'QIYMAT 04', ru: 'ЦЕННОСТЬ 04', en: 'VALUE 04' },
    description: {
      uz: 'Vaqtinchalik matn. Brend qiymati mijozdan kutilmoqda.',
      ru: 'Временный текст. Ценность бренда ожидается от клиента.',
      en: 'Placeholder text. Brand value pending from the client.',
    },
    image: { src: '/fruits/placeholder-peach.svg', alt: '', width: 320, height: 320 },
  },
];
