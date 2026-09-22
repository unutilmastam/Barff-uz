import { ContentStatus, type Prisma } from '@barff/db';

/**
 * Ommaviy ko'rinish sharti.
 *
 * Bu YAGONA joy. Har bir so'rovda qo'lda `status: 'PUBLISHED'` yozilsa,
 * birortasida unutilishi va tayyor bo'lmagan matn saytga chiqib ketishi
 * aniq — shuning uchun shart shu yerdan olinadi.
 */
export const PUBLISHED_WHERE = {
  status: ContentStatus.PUBLISHED,
  deletedAt: null,
} as const;

/** O'chirish ustuni yo'q modellar uchun (production steps, homepage). */
export const PUBLISHED_ONLY = { status: ContentStatus.PUBLISHED } as const;

/**
 * Yangiliklar uchun qo'shimcha shart.
 *
 * `publishedAt` kelajakda bo'lsa, maqola `PUBLISHED` bo'lsa ham hali
 * ko'rinmaydi — bu rejalashtirilgan nashrni beradi.
 */
export function publishedNewsWhere(now: Date = new Date()): Prisma.NewsArticleWhereInput {
  return {
    ...PUBLISHED_WHERE,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  };
}
