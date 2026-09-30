import { type MetadataRoute } from 'next';

/**
 * PWA manifesti (CLAUDE.md §6, `ROADMAP.md` S33).
 *
 * `display: 'standalone'` — telefonga o'rnatilgach brauzer
 * manzil qatorisiz ochiladi va ekranning har bir pikseli ishga
 * ketadi. Haydovchi uchun bu bir qator matn emas, bir qator
 * yetkazma degani.
 *
 * `orientation: 'portrait'` — telefon bir qo'lda ushlanadi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BARFF yetkazish',
    short_name: 'BARFF',
    description: 'Haydovchi uchun yetkazmalar',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0c7830',
    lang: 'uz',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
