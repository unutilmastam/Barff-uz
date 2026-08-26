/**
 * BARFF — global motion konstantalari.
 *
 * Butun saytdagi har bir animatsiya shu qiymatlardan foydalanadi.
 * Komponent ichida "sehrli raqam" (0.7, 1.2, "power3.out") yozilmaydi.
 *
 * Qiymatlar `styles/globals.css` dagi `--duration-*` / `--ease-*` bilan bir xil.
 */

/** Davomiylik — sekundlarda (GSAP shu birlikda ishlaydi). */
export const DURATION = {
  /** Micro-interaksiya: hover, tugma, ikonka. 250–400ms */
  micro: 0.3,
  /** UI: menyu, modal, kursor holati. 400–700ms */
  ui: 0.55,
  /** Bo'lim reveal: matn, rasm, karta. 800–1200ms */
  section: 1,
  /** Hero va sahifa kirishi. 1000–2000ms */
  hero: 1.5,
} as const;

/** Chegaralar — tasodifiy qiymat yozilmasligi uchun hujjat sifatida. */
export const DURATION_RANGE = {
  micro: [0.25, 0.4],
  ui: [0.4, 0.7],
  section: [0.8, 1.2],
  hero: [1, 2],
} as const satisfies Record<keyof typeof DURATION, readonly [number, number]>;

/** GSAP easing nomlari. */
export const EASE = {
  /** Yumshoq, kichik harakatlar. */
  out2: 'power2.out',
  /** Standart — ko'pchilik reveal uchun. */
  out3: 'power3.out',
  /** Kuchli sekinlashish — katta siljishlar. */
  out4: 'power4.out',
  /** Eng dramatik — hero, sahifa o'tishi. */
  expo: 'expo.out',
  /** Ikki tomonlama — pin qilingan scroll uchun. */
  inOut3: 'power3.inOut',
} as const;

/** CSS/Framer Motion uchun bir xil egri chiziqlar. */
export const EASE_CSS = {
  out2: [0.25, 0.46, 0.45, 0.94],
  out3: [0.215, 0.61, 0.355, 1],
  out4: [0.165, 0.84, 0.44, 1],
  expo: [0.19, 1, 0.22, 1],
} as const;

/** Stagger — ketma-ket chiqish oralig'i. */
export const STAGGER = {
  tight: 0.04,
  text: 0.06,
  cards: 0.1,
  sections: 0.15,
} as const;

/**
 * Parallax tezliklari.
 * Dekor mahsulotdan tez harakatlanadi, fon esa eng sekin (BUILD_PLAN 11-qoida).
 */
export const PARALLAX = {
  background: 0.1,
  image: 0.25,
  fruit: 0.45,
} as const;

/**
 * Hero timeline nuqtalari — sekundlarda (BUILD_PLAN Phase 4).
 * Tartib: mahsulot → sarlavha → rasm → ikkilamchi matn → dekor.
 */
export const HERO_TIMELINE = {
  background: 0,
  logo: 0.2,
  heading: 0.4,
  headingStagger: 0.6,
  product: 0.8,
  fruit: 1,
  cta: 1.2,
  float: 1.5,
} as const;

/** Magnit tugma — maksimal siljish (px). Spec chegarasi: 8–15px. */
export const MAGNETIC_STRENGTH = 12;

/** Magnit tugma qaytishi — spring (elastic) parametrlari. */
export const MAGNETIC_RETURN = {
  duration: 0.7,
  ease: 'elastic.out(1, 0.4)',
} as const;

/** Lenis smooth scroll sozlamalari. */
export const LENIS = {
  /** Interpolyatsiya koeffitsienti — kichikroq = uzoqroq "sirpanish". */
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 1.5,
  /** Mobilda native scroll qoldiriladi — barmoq bilan sun'iy inertsiya yomon his qilinadi. */
  syncTouch: false,
} as const;

/** Marquee — cheksiz lenta. */
export const MARQUEE = {
  /** Bir nusxaning to'liq o'tish vaqti (s). Katta qiymat = sekinroq. */
  duration: 24,
  /** Hover'da tezlik shu koeffitsientga tushadi (0 EMAS — lenta to'xtamaydi). */
  hoverTimeScale: 0.25,
  /** Tezlik o'zgarishining yumshoqligi (s). */
  tweenDuration: 0.6,
} as const;

/** Kursor (faqat desktop). */
export const CURSOR = {
  /** Kursorning sichqonchaga yetib olish tezligi (s). */
  followDuration: 0.35,
  size: 12,
  activeSize: 64,
} as const;

/** Rasm reveal: `scale 1.15` → clip-path ochiladi → `scale 1`. */
export const IMAGE_REVEAL = {
  fromScale: 1.15,
  toScale: 1,
} as const;

/** ScrollTrigger uchun standart boshlanish/tugash nuqtalari. */
export const SCROLL_TRIGGER = {
  revealStart: 'top 85%',
  sectionStart: 'top 65%',
  pinEnd: 'bottom top',
} as const;

export type Duration = keyof typeof DURATION;
export type Ease = keyof typeof EASE;
