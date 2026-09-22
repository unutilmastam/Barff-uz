import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import type { NextConfig } from 'next';

/**
 * `NODE_ENV` EMAS, `phase` bo'yicha qaror qilinadi.
 *
 * NEGA: `NODE_ENV` — o'zgaruvchan muhit qiymati. `.env` da
 * `NODE_ENV=development` turadi, va uni yuklagan terminalda
 * `next build` ham "development" deb hisoblanardi — ya'ni ichki
 * sahifalar (`page.dev.tsx`) production bundle'iga TUSHIB KETISHI
 * mumkin edi. `phase` esa buyruqning o'zidan keladi: `next dev` —
 * development serveri, `next build` — har doim qurish. Shu sababli
 * kafolat muhit o'zgaruvchisiga bog'liq emas.
 *
 * (Alohida eslatma: `NODE_ENV=development` bilan `next build` Next'ning
 * o'zi tufayli baribir yiqiladi — u pages-router zaxira sahifasini
 * dev rejimida qurmoqchi bo'ladi. Ya'ni bu holat jimgina noto'g'ri
 * bundle bermaydi, balki ochiq xato beradi.)
 */
export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,

    /**
     * `page.dev.tsx` fayllari FAQAT `next dev` da sahifa hisoblanadi.
     *
     * Shu tufayli `/dev/ui` kabi ichki sahifalar production bundle'iga
     * umuman tushmaydi. Runtime tekshiruvi (`NODE_ENV === 'production'`
     * bo'lsa `notFound()`) bu ishni ishonchli bajarmasdi: sahifa baribir
     * qurilib, javob `200` bilan qaytardi.
     */
    pageExtensions: isDevServer ? ['tsx', 'ts', 'dev.tsx'] : ['tsx', 'ts'],

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
}
