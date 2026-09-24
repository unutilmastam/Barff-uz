import next from '@next/eslint-plugin-next';
import { baseConfig } from '@barff/config/eslint/base';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
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
