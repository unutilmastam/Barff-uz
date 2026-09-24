/*
  FAZA 1 UNUMDORLIK O'LCHOVI (CLAUDE.md §26).

  O'lchanadi:
    - LCP, CLS, FCP, TTFB — haqiqiy brauzer metrikalari
    - dastlabki yuklamada kelgan JS va rasm baytlari
    - og'ir 3D/animatsiya kodi DASTLABKI yuklamada YO'QLIGI

  MUHIM: 3D ni "kechiktirilgan" deb chunk NOMIGA qarab aytib bo'lmaydi —
  Next dinamik importni hash'langan faylga joylaydi. Shuning uchun
  three.js BORLIGI fayl MAZMUNIDAN qidiriladi.
*/
import { chromium } from 'playwright';

/**
 * Brauzer yo'li.
 *
 * Bu muhitda Chromium oldindan o'rnatilgan va `playwright` uni o'zi
 * topa olmaydi, shuning uchun yo'l `CHROMIUM_PATH` dan olinadi.
 * O'rnatilmagan bo'lsa — `playwright` ning o'z brauzeri ishlatiladi.
 */
function launchOptions() {
  const path = process.env.CHROMIUM_PATH;
  return path ? { executablePath: path } : {};
}

const BASE = 'http://127.0.0.1:3001';
const ROUTES = [
  '/uz',
  '/uz/products',
  '/uz/products/mock-olma-sharbati',
  '/uz/news',
  '/uz/contact',
];

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

for (const [name, opts] of [
  ['360 ', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }],
  ['1440', { viewport: { width: 1440, height: 900 } }],
]) {
  console.log(`\n=== ${name.trim()} px ===`);
  const ctx = await browser.newContext(opts);

  for (const route of ROUTES) {
    const page = await ctx.newPage();

    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

    /*
      Baytlar `content-length` sarlavhasidan OLINMAYDI: siqilgan yoki
      `chunked` javoblarda u umuman yo'q va yig'indi nolga yaqin
      chiqadi. `PerformanceResourceTiming.encodedBodySize` esa
      brauzer ROSTDAN qabul qilgan hajmni beradi.
    */
    const assets = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((r) => ({
        type: r.initiatorType,
        url: r.name,
        bytes: r.encodedBodySize,
      })),
    );

    const vitals = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const out = { lcp: null, cls: 0, fcp: null, ttfb: null };
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) out.ttfb = Math.round(nav.responseStart);
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          if (fcp) out.fcp = Math.round(fcp.startTime);

          new PerformanceObserver((l) => {
            const e = l.getEntries().at(-1);
            if (e) out.lcp = Math.round(e.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => resolve(out), 1200);
        }),
    );

    const js = assets.filter((a) => a.type === 'script' || /\.js(\?|$)/.test(a.url));
    const img = assets.filter(
      (a) => a.type === 'img' || /\.(avif|webp|png|jpe?g|svg)(\?|$)/i.test(a.url),
    );
    const jsBytes = js.reduce((s, a) => s + a.bytes, 0);
    const imgBytes = img.reduce((s, a) => s + a.bytes, 0);

    console.log(
      `  ${route}\n` +
        `    LCP=${vitals.lcp}ms  CLS=${vitals.cls.toFixed(4)}  FCP=${vitals.fcp}ms  TTFB=${vitals.ttfb}ms\n` +
        `    JS ${js.length} ta / ${kb(jsBytes)}   rasm ${img.length} ta / ${kb(imgBytes)}`,
    );

    // Google "yaxshi" chegaralari.
    check(
      vitals.lcp !== null && vitals.lcp < 2500,
      `LCP < 2.5s ${name} ${route}`,
      `${vitals.lcp}ms`,
    );
    check(vitals.cls < 0.1, `CLS < 0.1 ${name} ${route}`, vitals.cls.toFixed(4));

    // Rasm formati: AVIF/WebP bo'lishi kerak (CLAUDE.md §17).
    const rawImages = img.filter((a) => /\.(png|jpe?g)(\?|$)/i.test(a.url));
    check(
      rawImages.length === 0,
      `rasmlar AVIF/WebP ${name} ${route}`,
      rawImages.length > 0 ? rawImages[0].url.slice(-50) : 'hammasi',
    );

    await page.close();
  }
  await ctx.close();
}

// =====================================================================
// 3D/animatsiya DASTLABKI bundle'da EMASLIGI
// =====================================================================
console.log('\n=== Ogir kod kechiktirilganmi ===');
{
  /*
    DASTLABKI bundle — bu server qaytargan HTML ichidagi `<script src>`
    teglari. "Yuklanish boshlanganidan keyin N millisekund ichida nima
    keldi" deb o'lchash YARAMAYDI: lokal serverda dinamik import ham
    o'sha oyna ichida ulgurib keladi va o'lchov har doim "xato" deydi.

    Chunk NOMIGA qarab ham hukm chiqarilmaydi — Next dinamik importni
    hash'langan faylga joylaydi. Shuning uchun kutubxona fayl
    MAZMUNIDAN qidiriladi.
  */
  const html = await (await fetch(`${BASE}/uz`)).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  console.log(`     dastlabki HTML da ${srcs.length} ta <script src>`);

  let initialBytes = 0;
  let three = null;
  let gsap = null;

  for (const src of srcs) {
    const res = await fetch(src.startsWith('http') ? src : `${BASE}${src}`);
    const body = await res.text();
    initialBytes += body.length;
    /*
      Kutubxona ICHKI belgisi qidiriladi, nomi emas. `ScrollTrigger`
      so'zi dinamik importning O'ZIDA ham uchraydi
      (`await import('gsap/ScrollTrigger')`), `registerPlugin(` esa
      import'dan KEYINGI o'z kodimizda turadi — ikkalasi ham
      kechiktirish KODI, kutubxonaning o'zi emas. Ikkalasi ham
      yolg'on ishora bergani o'lchab aniqlangan.
    */
    if (/WebGLRenderer|isMesh\s*=/.test(body)) three = src;
    if (/gsap\.core|_gsap\b|CSSPlugin/.test(body)) gsap = src;
  }

  check(three === null, 'three.js DASTLABKI bundle da YOQ', three ?? 'topilmadi');
  check(gsap === null, 'GSAP DASTLABKI bundle da YOQ', gsap ?? 'topilmadi');
  console.log(`     dastlabki JS (siqilmagan) = ${kb(initialBytes)}`);

  // Ular KEYIN yuklanib, sahna ROSTDAN ishga tushishi kerak — aks holda
  // "kechiktirilgan" emas, "umuman yo'q" bo'lardi.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const late = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script') late.push(r.url());
  });
  await page.goto(`${BASE}/uz`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const canvas = await page.locator('canvas').count();
  const reveal = await page.locator('[data-reveal="on"]').count();
  check(canvas > 0, '3D sahna KEYIN yuklandi va ishga tushdi', `${canvas} ta canvas`);
  check(reveal > 0, 'GSAP ochilishlari KEYIN ishga tushdi', `${reveal} ta bolim`);
  console.log(`     jami yuklangan skript = ${late.length} ta`);

  await ctx.close();
}

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
