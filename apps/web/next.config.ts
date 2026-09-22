import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // Ishchi maydondagi paketlar TypeScript manbasi sifatida keladi —
  // Next ularni o'zi transpilatsiya qilishi kerak.
  transpilePackages: ['@barff/types', '@barff/utils', '@barff/validation'],

  // Docker tasviri uchun: faqat kerakli fayllar bilan mustaqil chiqish.
  output: 'standalone',

  // Monorepo ildizini aniq ko'rsatamiz, aks holda Next lockfile'ni izlab
  // noto'g'ri katalogni tanlashi mumkin.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,

  poweredByHeader: false,
};

export default config;
