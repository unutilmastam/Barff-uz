/**
 * REPLACE_WITH_REAL_DATA
 *
 * CLAUDE.md §1: kompaniya faktlari O'YLAB TOPILMAYDI. Shuning uchun bu
 * yerda ishonarli ko'rinadigan raqamlar yo'q — faqat BARFF tasdiqlashi
 * kerak bo'lgan MAYDONLAR ro'yxati. Qiymat o'rnida `—` turadi va har
 * biri `unverified` deb belgilanadi, shuning uchun ekranga tushgan
 * rasm ham hech kimni chalg'itmaydi.
 *
 * Kerakli ma'lumotlar `docs/OPEN-QUESTIONS.md` da ham yozilgan.
 */
export const PENDING_VALUE = '—';

export const COMPANY_STAT_KEYS = ['founded', 'capacity', 'products', 'regions'] as const;

export type CompanyStatKey = (typeof COMPANY_STAT_KEYS)[number];
