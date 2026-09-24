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
import { AxeBuilder } from '@axe-core/playwright';

const BASE = 'http://127.0.0.1:3001';
/** Ekran nusxalari uchun katalog. Berilmasa — nusxa olinmaydi. */
const OUT = process.argv[2];

const routes = [
  '/uz',
  '/uz/company',
  '/uz/products',
  '/uz/products/mock-olma-sharbati',
  '/uz/production',
  '/uz/quality',
  '/uz/partners',
  '/uz/news',
  '/uz/gallery',
  '/uz/catalog',
  '/uz/contact',
  '/uz/privacy',
  '/uz/terms',
  '/ru',
  '/en/products',
];
const viewports = [
  { name: '360', opts: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } },
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
];

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

let failures = 0;

for (const { name, opts } of viewports) {
  const ctx = await browser.newContext(opts);
  for (const route of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });

    /*
      LOKAL CHEKLOV, ilova kamchiligi EMAS.

      S3 sozlanmagan muhitda media adapteri `memory://` manzil
      qaytaradi va brauzer bunday sxemani yuklay olmaydi. Production'da
      bu holat BO'LMAYDI: S3 sozlamasi yetishmasa API umuman
      ko'tarilmaydi (`storage.module.ts`). Buni xato deb sanash butun
      to'plamni doimiy qizil qilib qo'yardi va haqiqiy xatolar
      shovqin ichida yo'qolardi.
    */
    const localOnly = (text) => /ERR_UNKNOWN_URL_SCHEME/.test(text);

    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    const h1 = await page.evaluate(() => document.querySelectorAll('h1').length);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));

    const realErrors = errors.filter((e) => !localOnly(e));
    const skipped = errors.length - realErrors.length;
    const bad = overflow > 0 || serious.length > 0 || realErrors.length > 0 || h1 !== 1;
    console.log(
      `${bad ? 'XATO' : ' OK '} ${name} ${route}  overflow=${overflow}px h1=${h1} axe=${results.violations.length}(jiddiy ${serious.length}) konsol=${realErrors.length}${skipped > 0 ? ` (+${skipped} lokal memory://)` : ''}`,
    );
    for (const v of results.violations) {
      console.log(`      [${v.impact}] ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 2)) console.log(`          ${n.target.join(' ')}`);
    }
    for (const e of realErrors.slice(0, 3)) console.log(`      konsol: ${e}`);
    if (bad) failures += 1;

    if (name === '360' && OUT) {
      await page.screenshot({ path: `${OUT}/360${route.replace(/\//g, '_')}.png`, fullPage: true });
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammoli sahifa'}`);
process.exit(failures === 0 ? 0 : 1);
