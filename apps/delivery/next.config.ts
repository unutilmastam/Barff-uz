import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import type { NextConfig } from 'next';

/**
 * Haydovchi PWA'si (`delivery.barff.uz`).
 *
 * Boshqa ilovalar bilan bir xil yondashuv: `phase` bo'yicha qaror,
 * ishchi maydondagi paketlar transpilatsiya qilinadi, Docker uchun
 * mustaqil chiqish.
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
     * Haydovchi ilovasi qidiruvga UMUMAN tushmasligi kerak: bu
     * yerda mijozlarning manzillari va telefonlari bor.
     */
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'no-referrer' },
          ],
        },
        {
          /*
            XIZMAT ISHCHISI KESHLANMAYDI.

            Keshlangan `sw.js` ESKI qoidalar bilan ishlashda davom
            etardi va yangi versiya hech qachon o'rnatilmasdi —
            ilova "yangilanmaydigan" bo'lib qolardi. Bu PWA'larning
            eng keng tarqalgan tuzog'i.
          */
          source: '/sw.js',
          headers: [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { key: 'Service-Worker-Allowed', value: '/' },
          ],
        },
      ];
    },
  };
}
