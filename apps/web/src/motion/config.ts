/**
 * Harakat sozlamalari — YAGONA manba (CLAUDE.md §17).
 *
 * NEGA bir joyda: har bir komponent o'z davomiyligi va egri chizig'ini
 * yozsa, sayt bo'ylab harakat bir-biriga mos kelmay qoladi — bittasi
 * 200ms, boshqasi 900ms bo'lib, natija "premium" emas, tasodifiy
 * ko'rinadi.
 *
 * Qiymatlar `packages/config/tailwind/theme.css` dagi token'lar bilan
 * BIR XIL va buni `config.test.ts` qo'riqlaydi: CSS o'tishlari va GSAP
 * animatsiyalari bir ritmda ishlashi kerak.
 *
 * Qiymatlar 2026-08-26 dagi qurilishdan tiklandi (git `a86f349`) —
 * buyurtmachi o'sha harakat tizimini so'radi.
 */

/** Soniyada — GSAP soniya bilan ishlaydi, CSS esa millisekund bilan. */
export const DURATION = {
  /** Micro-interaksiya: hover, tugma, ikonka. */
  fast: 0.3,
  /** UI: menyu, modal, kursor holati. */
  base: 0.55,
  /** Bo'lim ochilishi: matn, rasm, kartochka. */
  slow: 1,
  /** Hero va sahifa kirishi. */
  hero: 1.5,
} as const;

/**
 * GSAP easing nomlari.
 *
 * `EASE` — standart (ko'pchilik reveal). Qolganlari kuchi bo'yicha
 * tartiblangan; `--ease-barff` token'i `out3` ning aynan o'zi.
 */
export const EASE = 'power3.out';

export const EASES = {
  /** Yumshoq, kichik harakatlar. */
  out2: 'power2.out',
  /** Standart. */
  out3: 'power3.out',
  /** Kuchli sekinlashish — katta siljishlar. */
  out4: 'power4.out',
  /** Eng dramatik — hero, sahifa o'tishi. */
  expo: 'expo.out',
  /** Ikki tomonlama — pin qilingan scroll uchun. */
  inOut3: 'power3.inOut',
} as const;

/** Bo'lim ochilishida elementlar orasidagi kechikish. */
export const STAGGER = 0.08;

/** Turi bo'yicha ketma-ketlik oralig'i. */
export const STAGGERS = {
  tight: 0.04,
  text: 0.06,
  cards: 0.1,
  sections: 0.15,
} as const;

/**
 * Element ekranning qaysi nuqtasiga yetganda animatsiya boshlanadi.
 *
 * `85%` — element ekranning pastki qismiga kirganda. Kechroq qilinsa,
 * foydalanuvchi bo'sh joyni ko'rib ulguradi.
 */
export const REVEAL_START = 'top 85%';

/** Yiriq bo'limlar uchun — ular kechroq boshlanadi. */
export const SECTION_START = 'top 65%';

/** Ochilishda element qancha pastdan ko'tariladi (px). */
export const REVEAL_DISTANCE = 24;

/**
 * Parallaks tezliklari.
 *
 * Dekor mahsulotdan TEZ harakatlanadi, fon esa eng sekin — shu bilan
 * chuqurlik hissi paydo bo'ladi.
 */
export const PARALLAX = {
  background: 0.1,
  image: 0.25,
  fruit: 0.45,
  /**
   * Mobilda parallaks kuchi shu koeffitsientga ko'paytiriladi.
   * Tor ekranda katta siljish elementlarni bir-birining ustiga
   * chiqarib yuboradi va skroll "og'ir" his qilinadi.
   */
  mobileFactor: 0.45,
} as const;

/** `gsap.matchMedia` shartlari. */
export const MEDIA = {
  desktop: '(min-width: 768px)',
  mobile: '(max-width: 767px)',
  pointerFine: '(hover: hover) and (pointer: fine)',
} as const;

/** Magnit tugma — maksimal siljish (px) va qaytish springi. */
export const MAGNETIC = {
  strength: 12,
  returnDuration: 0.7,
  returnEase: 'elastic.out(1, 0.4)',
} as const;

/** Rasm reveal: `scale 1.15` → clip-path ochiladi → `scale 1`. */
export const IMAGE_REVEAL = {
  fromScale: 1.15,
  toScale: 1,
} as const;

/** Cheksiz lenta (marquee). */
export const MARQUEE = {
  /** Bir nusxaning to'liq o'tish vaqti (s). */
  duration: 24,
  /** Hover'da tezlik shu koeffitsientga tushadi — NOLGA emas, lenta to'xtamaydi. */
  hoverTimeScale: 0.25,
  tweenDuration: 0.6,
} as const;

/**
 * Lenis yumshoq skroll.
 *
 * `syncTouch: false` — mobilda native skroll qoladi: barmoq bilan
 * sun'iy inertsiya yomon his qilinadi.
 */
export const LENIS = {
  /** Interpolyatsiya koeffitsienti — kichikroq = uzoqroq "sirpanish". */
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 1.5,
  syncTouch: false,
} as const;

/** Hero mahsuloti — kirish, uzluksiz suzish va kursorga reaksiya. */
export const HERO_PRODUCT = {
  fromScale: 0.65,
  toScale: 1,
  fromRotation: -8,
  toRotation: 0,
  floatDistance: 14,
  floatDuration: 3.5,
  floatRotation: 1.5,
  tiltMax: 10,
  tiltSmoothing: 0.6,
} as const;

/** Hero'dagi suzuvchi mevalar. */
export const HERO_FRUIT = {
  floatDistance: 18,
  /** Har meva o'z tezligiga ega — bir vaqtda tebranmasligi uchun oraliq. */
  floatDurationMin: 4,
  floatDurationMax: 7,
  /** Mobilda ko'rsatiladigan maksimal meva soni. */
  mobileMaxCount: 2,
} as const;

/**
 * Hero timeline nuqtalari (s).
 * Tartib: fon → yorliq → sarlavha → mahsulot → meva → CTA → suzish.
 */
export const HERO_TIMELINE = {
  background: 0,
  label: 0.2,
  heading: 0.4,
  headingStagger: 0.6,
  product: 0.8,
  fruit: 1,
  cta: 1.2,
  float: 1.5,
} as const;
