import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Barcha paket va ilovalar uchun umumiy ESLint qoidalari.
 *
 * Ilovaga xos qoidalar (React, Next, Nest) o'z konfiguratsiyasida
 * shu presetni kengaytirish orqali qo'shiladi.
 */
export const baseConfig = tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    /*
      `scripts/` — Node'da ishlaydigan yordamchi skriptlar.

      Ular brauzerda ishlamaydi, shuning uchun `process` va `console`
      ular uchun oddiy global'lar; natijani konsolga chiqarish esa
      skriptning YAGONA vazifasi.
    */
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  prettier,
);

export default baseConfig;
