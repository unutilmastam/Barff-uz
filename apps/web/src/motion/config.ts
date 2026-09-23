/**
 * Harakat sozlamalari — YAGONA manba (CLAUDE.md §17).
 *
 * NEGA bir joyda: har bir komponent o'z davomiyligi va egri chizig'ini
 * yozsa, sayt bo'ylab harakat bir-biriga mos kelmay qoladi — bittasi
 * 200ms, boshqasi 900ms bo'lib, natija "premium" emas, tasodifiy
 * ko'rinadi.
 *
 * Qiymatlar `packages/config/tailwind/theme.css` dagi token'lar bilan
 * BIR XIL: CSS o'tishlari va GSAP animatsiyalari bir xil ritmda
 * ishlashi kerak.
 */

/** Soniyada — GSAP soniya bilan ishlaydi, CSS esa millisekund bilan. */
export const DURATION = {
  fast: 0.18,
  base: 0.32,
  slow: 0.72,
} as const;

/**
 * `cubic-bezier(0.22, 1, 0.36, 1)` — tez boshlanib, yumshoq tugaydi.
 *
 * Bu `--ease-barff` token'ining aynan o'zi. GSAP o'z nomlarini
 * ishlatadi, shuning uchun qiymat qo'lda yoziladi.
 */
export const EASE = 'power3.out';

/** Bo'lim ochilishida elementlar orasidagi kechikish. */
export const STAGGER = 0.08;

/**
 * Element ekranning qaysi nuqtasiga yetganda animatsiya boshlanadi.
 *
 * `85%` — element ekranning pastki qismiga kirganda. Kechroq qilinsa,
 * foydalanuvchi bo'sh joyni ko'rib ulguradi.
 */
export const REVEAL_START = 'top 85%';

/** Ochilishda element qancha pastdan ko'tariladi (px). */
export const REVEAL_DISTANCE = 24;
