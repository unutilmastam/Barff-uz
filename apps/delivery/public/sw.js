/*
  XIZMAT ISHCHISI (service worker) — ILOVA OFLAYN OCHILISHI UCHUN.

  ==========================================================
  NIMANI KESHLAYDI VA NIMANI KESHLAMAYDI
  ==========================================================

  KESHLANADI: ilova qobig'i — HTML, JS, CSS, ikonkalar. Ularsiz
  tarmoqsiz joyda ilova UMUMAN ochilmasdi va navbatning o'zi ham
  foydasiz bo'lardi.

  KESHLANMAYDI: API javoblari. Ular HAYDOVCHIGA XOS va tez
  o'zgaradi; keshlangan yetkazmalar ro'yxati "bu ish hali ham
  sizda" deb yolg'on gapirardi. Ro'yxat oxirgi muvaffaqiyatli
  javobdan MIJOZDA saqlanadi va u yerda ochiq "oflayn ma'lumot"
  deb belgilanadi.

  Bu farq muhim: kesh JIM yolg'on gapiradi, mijozdagi nusxa esa
  o'zini oshkor qiladi.
*/
const SHELL_CACHE = 'barff-delivery-shell-v1';

/*
  Oldindan keshlanadigan minimal ro'yxat.

  Sahifalar ro'yxati EMAS: Next.js chunk nomlari har qurishda
  o'zgaradi va ularni qo'lda sanash eskirgan ro'yxat berardi.
  Qobiq TALAB BO'YICHA to'ldiriladi (quyida).
*/
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Faqat O'Z kelib chiqishimiz va faqat `GET`.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
    API — HECH QACHON keshdan berilmaydi.

    Keshlangan javob "bu ish sizda" deb yolg'on gapirardi va
    haydovchi allaqachon boshqasiga berilgan manzilga borardi.
  */
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      try {
        const response = await fetch(request);

        // Faqat muvaffaqiyatli javob keshlanadi.
        if (response.ok) await cache.put(request, response.clone());

        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached !== undefined) return cached;

        /*
          Sahifa ham, kesh ham yo'q. Navigatsiya so'rovi uchun
          bosh sahifani berishga urinamiz — ilova ochilsa,
          navbat va oflayn ro'yxat ishlaydi.
        */
        if (request.mode === 'navigate') {
          const shell = await cache.match('/');
          if (shell !== undefined) return shell;
        }

        return new Response('Oflayn', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
  );
});
