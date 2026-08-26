import type { Localized } from '@/lib/types';

/**
 * ABOUT bo'limidagi katta editorial matn.
 *
 * [CLIENT CONTENT REQUIRED] — brend haqidagi matn. Quyidagi qatorlar faqat maket uchun:
 * BARFF haqida hech qanday fakt, tarix yoki da'vo o'ylab topilmagan.
 */
export const aboutLines: Localized[] = [
  {
    uz: 'Bu — vaqtinchalik editorial matn.',
    ru: 'Это — временный редакционный текст.',
    en: 'This is placeholder editorial copy.',
  },
  {
    uz: 'Brend haqidagi haqiqiy matn mijozdan kutilmoqda.',
    ru: 'Настоящий текст о бренде ожидается от клиента.',
    en: 'The real brand copy is pending from the client.',
  },
  {
    uz: 'Har qator pastdan, maska ostidan chiqadi.',
    ru: 'Каждая строка появляется снизу, из-под маски.',
    en: 'Each line rises from beneath a mask.',
  },
];
