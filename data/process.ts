import type { ProcessStep } from '@/lib/types';

/**
 * PROCESS — ishlab chiqarish bosqichlari.
 *
 * Bosqich NOMLARI spec'da belgilangan (FRUIT → SELECTION → PROCESS → QUALITY → BOTTLE),
 * shuning uchun ular tuzilma sifatida qoldirildi. Ammo har bosqichda NIMA qilinishi —
 * ishlab chiqarish da'vosi, u o'ylab topilmaydi.
 * [CLIENT CONTENT REQUIRED] — ishlab chiqarish jarayoni tavsifi.
 */
export const processSteps: ProcessStep[] = [
  {
    id: 'step-fruit',
    index: '01',
    label: 'FRUIT',
    title: { uz: 'MEVA', ru: 'ФРУКТ', en: 'FRUIT' },
    description: {
      uz: 'Vaqtinchalik matn. Bosqich tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание этапа ожидается от клиента.',
      en: 'Placeholder text. Step description pending from the client.',
    },
    image: { src: '/fruits/placeholder-citrus-orange.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'step-selection',
    index: '02',
    label: 'SELECTION',
    title: { uz: 'SARALASH', ru: 'ОТБОР', en: 'SELECTION' },
    description: {
      uz: 'Vaqtinchalik matn. Bosqich tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание этапа ожидается от клиента.',
      en: 'Placeholder text. Step description pending from the client.',
    },
    image: { src: '/fruits/placeholder-apple.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'step-process',
    index: '03',
    label: 'PROCESS',
    title: { uz: 'ISHLOV', ru: 'ОБРАБОТКА', en: 'PROCESS' },
    description: {
      uz: 'Vaqtinchalik matn. Bosqich tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание этапа ожидается от клиента.',
      en: 'Placeholder text. Step description pending from the client.',
    },
    image: { src: '/fruits/placeholder-citrus-lime.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'step-quality',
    index: '04',
    label: 'QUALITY',
    title: { uz: 'SIFAT', ru: 'КАЧЕСТВО', en: 'QUALITY' },
    description: {
      uz: 'Vaqtinchalik matn. Bosqich tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание этапа ожидается от клиента.',
      en: 'Placeholder text. Step description pending from the client.',
    },
    image: { src: '/fruits/placeholder-leaf.svg', alt: '', width: 320, height: 320 },
  },
  {
    id: 'step-bottle',
    index: '05',
    label: 'BOTTLE',
    title: { uz: 'SHISHA', ru: 'БУТЫЛКА', en: 'BOTTLE' },
    description: {
      uz: 'Vaqtinchalik matn. Bosqich tavsifi mijozdan kutilmoqda.',
      ru: 'Временный текст. Описание этапа ожидается от клиента.',
      en: 'Placeholder text. Step description pending from the client.',
    },
    image: { src: '/products/placeholder-bottle-01.svg', alt: '', width: 400, height: 720 },
  },
];
