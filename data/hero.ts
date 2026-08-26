import type { HeroFruit, ImageAsset, Localized } from '@/lib/types';

/**
 * HERO KONTENTI
 *
 * Bu yerdagi hamma narsa mijozdan kutilmoqda. Hech qanday sarlavha, shior, da'vo
 * yoki rasm o'ylab topilmaydi (BUILD_PLAN 8- va 9-qoidalar).
 *
 * Kontent kelgach faqat shu fayl to'ldiriladi — komponentlar o'zgarmaydi.
 */

/**
 * Bosh sarlavha. Uch tilda beriladi.
 *
 * VAQTINCHALIK: quyidagi matn faqat maket uchun — bu BARFF'ning tasdiqlangan shiori EMAS.
 * [CLIENT CONTENT REQUIRED] — brend sarlavhasi / shiori.
 */
export const heroHeadline: Localized | null = {
  uz: 'Tabiat shishada',
  ru: 'Природа в бутылке',
  en: 'Nature in a bottle',
};

/**
 * Sarlavha ostidagi qisqa matn.
 * [CLIENT CONTENT REQUIRED] — brend tavsifi.
 */
export const heroSubline: Localized | null = {
  uz: 'Vaqtinchalik matn — brend tavsifi mijozdan kutilmoqda.',
  ru: 'Временный текст — описание бренда ожидается от клиента.',
  en: 'Placeholder text — brand description pending from the client.',
};

/**
 * Mahsulot fotosurati — shaffof fonli PNG/WebP, `public/products/` ichida.
 * Hero'ning ASOSIY vizual fokusi.
 *
 * VAQTINCHALIK: loyiha uchun chizilgan SVG maket (yorlig'ida "PLACEHOLDER" yozuvi bor).
 * [CLIENT CONTENT REQUIRED] — haqiqiy mahsulot fotosurati.
 */
export const heroProduct: ImageAsset | null = {
  src: '/products/placeholder-bottle-01.svg',
  alt: 'BARFF placeholder',
  width: 400,
  height: 720,
};

/**
 * Mahsulot atrofidagi dekorativ mevalar — `public/fruits/` ichida.
 *
 * VAQTINCHALIK: loyiha uchun chizilgan SVG maketlar, boshqa saytdan ko'chirilmagan.
 * `mobile: true` bo'lganlari mobilda ham ko'rinadi (maks 2 ta).
 * [CLIENT CONTENT REQUIRED] — haqiqiy meva rasmlari.
 */
export const heroFruits: HeroFruit[] = [
  // Joylashuv mahsulotni ROMKALAYDI: matn ustuni (chap) ham, shisha ham bosilmaydi.
  { id: 'orange', src: '/fruits/placeholder-citrus-orange.svg', x: 51, y: 8, scale: 0.85, rotation: -14, speed: 1, parallax: 0.45, mobile: true, mobileX: 62, mobileY: 46 },
  { id: 'peach', src: '/fruits/placeholder-peach.svg', x: 90, y: 10, scale: 0.55, rotation: 24, speed: 1.1, parallax: 0.3, mobile: false },
  { id: 'leaf', src: '/fruits/placeholder-leaf.svg', x: 89, y: 66, scale: 0.7, rotation: 18, speed: 0.8, parallax: 0.45, mobile: true, mobileX: 2, mobileY: 62 },
  { id: 'berries', src: '/fruits/placeholder-berries.svg', x: 52, y: 72, scale: 0.6, rotation: -6, speed: 1.2, parallax: 0.25, mobile: false },
  { id: 'lime', src: '/fruits/placeholder-citrus-lime.svg', x: 57, y: 78, scale: 0.5, rotation: 10, speed: 1.4, parallax: 0.3, mobile: false },
];

/**
 * Mahsulot yonidagi teglar (masalan tarkib yoki xususiyat yozuvlari).
 * BO'SH QOLADI: bu mahsulot da'volari — mijoz tasdiqlamaguncha yozilmaydi.
 * [CLIENT CONTENT REQUIRED] — hero teglari.
 */
export const heroTags: Localized[] = [];  // DA'VOLAR — mijoz tasdiqlamaguncha bo'sh qoladi.

/**
 * Zarrachalar qatlami. Standart holatda O'CHIQ.
 * Spec: "ixtiyoriy, ortiqcha shovqin bo'lmasin" — brend vizuali aniqlangach yoqiladi.
 */
export const heroParticlesEnabled = false;
