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

  const value =
    configured !== undefined && configured.length > 0 ? configured : 'http://localhost:3001';

  return value.replace(/\/+$/, '');
}
