/*
  FAZA 1 QULAYLIK PASSI (CLAUDE.md §29, ROADMAP S21).

  `s13.mjs` axe-core bilan QOIDA buzilishlarini qidiradi (kontrast,
  alt matn, ARIA). Bu skript esa axe TEKSHIRA OLMAYDIGAN narsalarni
  o'lchaydi: klaviatura bilan haqiqiy yurish, fokus KO'RINISHI va
  fokus TARTIBI hujjat tartibiga mos kelishi.
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
const ROUTES = ['/uz', '/ru/products', '/en/contact', '/uz/news', '/uz/gallery'];

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

/** O'tkazib yuborish havolasi matni — UCHALA tilda (CLAUDE.md §18). */
const SKIP_LINK = /asosiy kontentga|skip to content|перейти к содержимому/i;

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

for (const route of ROUTES) {
  console.log(`\n=== ${route} ===`);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

  // --- 1. Birinchi Tab o'tkazib yuborish havolasiga tushadi ---
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, text: (el?.textContent ?? '').trim().slice(0, 40) };
  });
  check(SKIP_LINK.test(first.text), 'birinchi Tab — otkazib yuborish havolasi', first.text);

  // --- 2. Klaviatura bilan 40 qadam: hech qayerda tiqilib qolmaydi ---
  const seen = [];
  let invisibleFocus = 0;
  for (let i = 0; i < 40; i += 1) {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      // Fokus KO'RINADIMI: outline yoki ring soyasi bo'lishi kerak.
      const ring =
        style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
          ? true
          : style.boxShadow !== 'none';
      /*
        Elementning qaysi BO'LIMda turgani. Ustunli joylashuv
        (masalan futer) ichida fokus yuqoriga qaytishi NORMAL —
        muhimi, u OLDINGI bo'limga qaytib ketmasligi.
      */
      const landmarks = [...document.querySelectorAll('header, main, section, footer')];
      const owner = el.closest('header, main, section, footer');
      return {
        key: `${el.tagName}#${el.id}.${el.className}`.slice(0, 60),
        section: owner ? landmarks.indexOf(owner) : -1,
        ring,
        hidden: box.width === 0 && box.height === 0,
      };
    });
    if (info === null) break;
    if (!info.ring && !info.hidden) invisibleFocus += 1;
    seen.push(info);
    await page.keyboard.press('Tab');
  }

  check(seen.length >= 5, 'klaviatura bilan yurish mumkin', `${seen.length} ta element`);
  check(invisibleFocus === 0, 'har bir fokus KORINADI', `${invisibleFocus} ta korinmas`);

  // --- 3. Fokus TARTIBI hujjat tartibiga mos (pastga qarab) ---
  /*
    PIKSEL koordinatasi bilan o'lchash YARAMAYDI: ustunli futerda
    ikkinchi ustun sahifaning yuqorisidan boshlanadi va har doim
    "orqaga sakrash" bo'lib ko'rinadi — bu esa to'g'ri tartib,
    o'qish ustun-ustun boradi. Shuning uchun fokus OLDINGI BO'LIMga
    qaytib ketmasligi tekshiriladi.
  */
  let backJumps = 0;
  for (let i = 1; i < seen.length; i += 1) {
    if (seen[i].section >= 0 && seen[i - 1].section >= 0 && seen[i].section < seen[i - 1].section) {
      backJumps += 1;
    }
  }
  check(backJumps === 0, 'fokus oldingi bolimga qaytmaydi', `${backJumps} ta orqaga sakrash`);

  // --- 4. Har bir rasmda alt (bo'sh alt bezak uchun ruxsat) ---
  const noAlt = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => !i.hasAttribute('alt'))
      .map((i) => i.currentSrc || i.src)
      .slice(0, 3),
  );
  check(noAlt.length === 0, 'har bir rasmda alt atributi bor', noAlt.join(' '));

  // --- 5. Til atributi yo'nalishga mos ---
  const lang = await page.getAttribute('html', 'lang');
  const expected = route.split('/')[1];
  check(lang === expected, 'html lang togri', `${lang}`);

  await page.close();
}

await ctx.close();
await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
