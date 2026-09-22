import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Ildiz ESLint konfiguratsiyasi.
 *
 * S01 da `packages/config` umumiy presetlarni beradi va app'lar o'sha yerdan
 * meros oladi; hozircha ildiz darajasidagi minimal qoidalar yetarli.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'index.html',
      // Generatsiya qilingan Prisma klienti tekshirilmaydi.
      'packages/db/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Ishlatilmagan o'zgaruvchilar xato, lekin `_` bilan boshlanuvchilar kechiriladi.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Konsolga chiqarish faqat ogohlantirish/xato uchun (tuzilgan logger — S02).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
);
