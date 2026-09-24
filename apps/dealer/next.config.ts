import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import type { NextConfig } from 'next';

/**
 * Diler portali (`partner.barff.uz`).
 *
 * `apps/admin` bilan bir xil yondashuv: `phase` bo'yicha qaror (muhit
 * o'zgaruvchisi emas), ishchi maydondagi paketlar transpilatsiya
 * qilinadi, Docker uchun mustaqil chiqish.
 */
export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,

    pageExtensions: isDevServer ? ['tsx', 'ts', 'dev.tsx'] : ['tsx', 'ts'],

    transpilePackages: ['@barff/types', '@barff/ui', '@barff/utils', '@barff/validation'],

    output: 'standalone',
    outputFileTracingRoot: new URL('../../', import.meta.url).pathname,

    poweredByHeader: false,

    /**
     * Diler portali qidiruv tizimlariga UMUMAN tushmasligi kerak.
     *
     * Bu `robots.txt` dan ham kuchliroq: sarlavha har bir javobda
     * keladi va uni chetlab o'tib bo'lmaydi. Bu yerda diler narxlari
     * bor — ular ommaviy emas.
     */
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
            // Portal hech qachon `<iframe>` ichiga solinmasligi kerak —
            // clickjacking'ning eng oddiy yo'li.
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'no-referrer' },
          ],
        },
      ];
    },
  };
}
