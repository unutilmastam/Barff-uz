import next from '@next/eslint-plugin-next';
import globals from 'globals';
import { baseConfig } from '@barff/config/eslint/base';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    /*
      XIZMAT ISHCHISI — BOSHQA GLOBALLAR.

      `public/sw.js` brauzer sahifasida emas, ISHCHI kontekstida
      ishlaydi: u yerda `window` yo'q, lekin `self`, `caches` va
      `clients` bor.

      Blok SHU YERDA, ildizda emas: ESLint 10 konfiguratsiyani
      tekshirilayotgan fayl KATALOGIDAN qidiradi, ya'ni ildizdagi
      qoida `apps/delivery/public/sw.js` ga umuman yetib
      kelmasdi. Men avval uni ildizga yozib, nega ishlamayotganini
      `--print-config` bilan topdim.
    */
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  ...baseConfig,
  {
    plugins: { '@next/next': next },
    rules: {
      // Next.js ning o'z qoidalari: `<img>` o'rniga `next/image`,
      // `<a>` o'rniga `next/link` va hokazo.
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
];
