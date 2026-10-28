import js from '@eslint/js';
import globals from 'globals';
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
      // cPanel joylash to'plami — qurish natijasi, manba emas
      // (`scripts/package-cpanel.mjs`).
      'dist-cpanel/**',
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
  {
    // Seed — CLI skripti: uning yagona chiqish kanali konsol.
    files: ['prisma/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    /*
      `qa/` — brauzerda yuriladigan tekshiruvlar (S21).

      Ikki xil global to'plami ARALASH: skriptning o'zi Node'da
      ishlaydi, `page.evaluate()` ichidagi funksiyalar esa BRAUZERda
      bajariladi va `document`/`performance` ni ko'radi. Shuning
      uchun ikkalasi ham e'lon qilinadi.

      Konsolga chiqarish — bu skriptlarning yagona vazifasi.
    */
    files: ['qa/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
  {
    // `scripts/` — Node CLI: chiqish kanali konsol, globallari Node.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // Serverga ko'chiriladigan CommonJS asbob (`api/tools/setup.cjs`): `require` ataylab.
    files: ['scripts/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { 'no-console': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
