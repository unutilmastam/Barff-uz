/**
 * BARFF — domen tiplari.
 *
 * Barcha `data/*.ts` fayllari shu tiplardan foydalanadi.
 * Hech bir komponent ichida kontent hardcode qilinmaydi.
 *
 * DIQQAT: to'liq mahsulot spetsifikatsiyasi (spec) hali repoda yo'q —
 * quyidagi tuzilma BUILD_PLAN Phase 5 va Phase 8 talablariga qarab yozilgan.
 * Mijoz spec'ni bergach maydonlar aniqlashtiriladi.
 */

import type { Dictionary } from '@/data/locales';

/** Ko'p tilli matn. Har til uchun alohida komponent QILINMAYDI (Phase 2). */
export type Locale = 'uz' | 'ru' | 'en';
export type Localized<T = string> = Record<Locale, T>;

/** Rasm — `next/image` uchun kerakli minimal ma'lumot. */
export interface ImageAsset {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/** Ozuqaviy qiymat qatori (100 ml uchun). */
export interface NutritionFact {
  /** Masalan: "Energiya", "Uglevodlar". */
  label: string;
  /** Masalan: "45 kcal", "11 g". */
  value: string;
}

/** Qadoq varianti. */
export interface Packaging {
  /** Masalan: "0.5 L". */
  volume: string;
  /** Masalan: "PET", "Shisha". */
  material?: string;
  image?: ImageAsset;
}

/** Mahsulot kategoriyasi (bosh sahifadagi 01 / 02 / 03 / 04 bloklari). */
export interface Category {
  id: string;
  slug: string;
  /** Ro'yxatdagi katta raqam: "01". */
  index: string;
  title: Localized;
  description: Localized;
  image?: ImageAsset;
  /** Kategoriya bilan bog'liq dekorativ meva rasmi. */
  fruit?: ImageAsset;
  href: string;
}

/** Mahsulot. */
export interface Product {
  id: string;
  slug: string;
  name: Localized;
  /** Qisqa tagline — karta va hero uchun. */
  tagline?: Localized;
  description: Localized;
  /** `Category.id` ga havola. */
  categoryId: string;
  /** Shaffof fonli mahsulot fotosurati (asosiy vizual fokus). */
  image?: ImageAsset;
  /** Galereya — mahsulot sahifasi uchun. */
  gallery?: ImageAsset[];
  /** Mahsulot atrofidagi dekorativ meva rasmlari. */
  fruits?: ImageAsset[];
  /** Bo'lim foni uchun brend rangi (HEX). Mijozdan kutilmoqda. */
  color?: string;
  ingredients?: string[];
  nutrition?: NutritionFact[];
  packaging?: Packaging[];
  /** Boshqa mahsulot `id` lari. */
  relatedIds?: string[];
  featured?: boolean;
}

/** Yangilik / maqola. */
export interface NewsItem {
  id: string;
  slug: string;
  title: Localized;
  excerpt: Localized;
  /** ISO sana: "2026-01-31". */
  date: string;
  image?: ImageAsset;
  /** Maqola tanasi — Phase 8 da formati aniqlanadi. */
  body?: Localized;
  tags?: string[];
}

/**
 * Navigatsiya elementi (menyu `data/navigation.ts` dan o'qiladi).
 * Matn o'zi emas, tarjima kaliti saqlanadi — bitta menyu uch tilda ishlaydi.
 */
export interface NavItem {
  id: string;
  /** `data/locales/*.ts` dagi `nav` ob'ekti kaliti. */
  labelKey: keyof Dictionary['nav'];
  href: string;
  children?: NavItem[];
}

/** Ijtimoiy tarmoq havolasi. */
export interface SocialLink {
  id: string;
  label: string;
  href: string;
  /** `lucide-react` ikonka nomi yoki `public/icons/` dagi fayl. */
  icon?: string;
}

/**
 * Hero'dagi suzuvchi meva.
 * Joylashuv foizda beriladi — ekran o'lchamiga qarab moslashadi.
 */
export interface HeroFruit {
  id: string;
  /** `public/fruits/` dagi shaffof fonli rasm. */
  src: string;
  /** Konteynerga nisbatan gorizontal joylashuv (%). */
  x: number;
  /** Konteynerga nisbatan vertikal joylashuv (%). */
  y: number;
  scale: number;
  /** Boshlang'ich burilish (deg). */
  rotation: number;
  /** Suzish tezligi — kattaroq = tezroq tebranadi. */
  speed: number;
  /** Scroll parallaks tezligi (`PARALLAX` qiymatlaridan). */
  parallax: number;
  /** Mobilda ko'rsatilsinmi. Mobil uchun kamroq meva qoldiriladi. */
  mobile?: boolean;
  /**
   * Mobil uchun alohida joylashuv (%). Mobilda layout vertikal ustunga aylanadi,
   * shuning uchun desktop koordinatalari matn ustiga tushib qoladi.
   * Berilmasa `x` / `y` ishlatiladi.
   */
  mobileX?: number;
  mobileY?: number;
}

/** Brend qiymati (PHILOSOPHY bo'limi). */
export interface Value {
  id: string;
  /** Ro'yxatdagi katta raqam: "01". */
  index: string;
  title: Localized;
  description: Localized;
  /** Hover'da ochiladigan rasm. */
  image?: ImageAsset;
}

/**
 * Tarixdagi bosqich (STORY bo'limi).
 * `year` — sana. Mijoz tasdiqlamaguncha `null`, interfeysda `[CLIENT CONTENT REQUIRED]`.
 */
export interface Milestone {
  id: string;
  year: string | null;
  title: Localized;
  description: Localized;
  image?: ImageAsset;
}

/** Ishlab chiqarish bosqichi (PROCESS bo'limi). */
export interface ProcessStep {
  id: string;
  index: string;
  /** Bosqich nomi — spec belgilagan: FRUIT / SELECTION / PROCESS / QUALITY / BOTTLE. */
  label: string;
  title: Localized;
  description: Localized;
  image?: ImageAsset;
}

/** Sotuv nuqtasi (Phase 7 — WHERE TO BUY). */
export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  mapUrl?: string;
}
