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
 * [CLIENT CONTENT REQUIRED] — brend sarlavhasi / shiori.
 */
export const heroHeadline: Localized | null = null;

/**
 * Sarlavha ostidagi qisqa matn.
 * [CLIENT CONTENT REQUIRED] — brend tavsifi.
 */
export const heroSubline: Localized | null = null;

/**
 * Mahsulot fotosurati — shaffof fonli PNG/WebP, `public/products/` ichida.
 * Hero'ning ASOSIY vizual fokusi. Rasm bo'lmaguncha o'rnida placeholder ko'rinadi.
 * [CLIENT CONTENT REQUIRED] — mahsulot fotosurati.
 */
export const heroProduct: ImageAsset | null = null;

/**
 * Mahsulot atrofidagi dekorativ mevalar — `public/fruits/` ichida shaffof fonli rasmlar.
 * Bo'sh qoldirilgan: mavjud bo'lmagan rasm o'rniga soxta dekor chizilmaydi.
 * [CLIENT CONTENT REQUIRED] — meva rasmlari.
 */
export const heroFruits: HeroFruit[] = [];

/**
 * Mahsulot yonidagi teglar (masalan tarkib yoki xususiyat yozuvlari).
 * BO'SH QOLADI: bu mahsulot da'volari — mijoz tasdiqlamaguncha yozilmaydi.
 * [CLIENT CONTENT REQUIRED] — hero teglari.
 */
export const heroTags: Localized[] = [];

/**
 * Zarrachalar qatlami. Standart holatda O'CHIQ.
 * Spec: "ixtiyoriy, ortiqcha shovqin bo'lmasin" — brend vizuali aniqlangach yoqiladi.
 */
export const heroParticlesEnabled = false;
