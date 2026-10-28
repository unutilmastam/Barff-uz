/**
 * Saytning ommaviy manzili.
 *
 * `sitemap.xml` va kanonik havolalar uchun TO'LIQ manzil kerak, shuning
 * uchun u sozlamadan olinadi. Qiymat berilmasa lokal manzil ishlatiladi —
 * production'da `NEXT_PUBLIC_SITE_URL` majburiy beriladi (S40).
 *
 * Oxiridagi `/` olib tashlanadi, aks holda manzillar `//products`
 * ko'rinishida chiqardi.
 */
export function siteUrl(): string {
  const configured = process.env['NEXT_PUBLIC_SITE_URL'];

  if (configured !== undefined && configured.length > 0) return configured.replace(/\/+$/, '');

  // Production'da jim `localhost` yo'q (api-client.ts dagi izohga qarang).
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL berilmagan (docs/DEPLOY-CPANEL.md §6, `pnpm release:cpanel`)',
    );
  }

  return 'http://localhost:3001';
}
