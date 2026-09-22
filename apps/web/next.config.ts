import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * `page.dev.tsx` fayllari FAQAT ishlab chiqishda sahifa hisoblanadi.
   *
   * Shu tufayli `/dev/ui` kabi ichki sahifalar production bundle'iga
   * umuman tushmaydi. Runtime tekshiruvi (`NODE_ENV === 'production'`
   * bo'lsa `notFound()`) bu ishni ishonchli bajarmasdi: sahifa baribir
   * qurilib, javob `200` bilan qaytardi.
   */
  pageExtensions: isDevelopment ? ['tsx', 'ts', 'dev.tsx'] : ['tsx', 'ts'],

  // Ishchi maydondagi paketlar TypeScript manbasi sifatida keladi —
  // Next ularni o'zi transpilatsiya qilishi kerak.
  transpilePackages: ['@barff/types', '@barff/ui', '@barff/utils', '@barff/validation'],

  // Docker tasviri uchun: faqat kerakli fayllar bilan mustaqil chiqish.
  output: 'standalone',

  // Monorepo ildizini aniq ko'rsatamiz, aks holda Next lockfile'ni izlab
  // noto'g'ri katalogni tanlashi mumkin.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,

  poweredByHeader: false,
};

export default config;
