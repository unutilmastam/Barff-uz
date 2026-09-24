/*
  KO'RINISH ALMASHTIRGICHI (yorug'/qorong'i).

  Ranglarning O'ZI `contrast.test.ts` da o'lchanadi va axe har bir
  sahifani ikkala ko'rinishda tekshiradi (`a11y-axe.mjs`). Bu skript
  esa MEXANIZMNI tekshiradi: tanlov qo'llanadimi, eslab qolinadimi va
  sahifa QORONG'I ko'rinib keyin oqarib ketmaydimi (FOUC).
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

const WEB = 'http://localhost:3001';
const ADMIN = 'http://localhost:3002';

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

/** Fon rangining yorqinligi: 0 = qora, 1 = oq. */
const brightness = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const bodyBrightness = (page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor).then(brightness);

// =====================================================================
// 1. TIZIM AFZALLIGI — hech narsa tanlanmagan holat
// =====================================================================
console.log('\n=== 1. Tizim afzalligi ===');
for (const [scheme, wantLight] of [
  ['dark', false],
  ['light', true],
]) {
  const ctx = await browser.newContext({
    colorScheme: scheme,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/uz`, { waitUntil: 'domcontentloaded' });

  const b = await bodyBrightness(page);
  const attr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  check(wantLight ? b > 0.8 : b < 0.2, `tizim '${scheme}' so'raganda mos fon`, b.toFixed(3));
  // Tanlov qilinmagan bo'lsa atribut QO'YILMAYDI — CSS tizim
  // afzalligini `:root:not([data-theme])` orqali ushlaydi.
  check(attr === null, `tizim '${scheme}' da data-theme qo'yilmaydi`, String(attr));

  await ctx.close();
}

// =====================================================================
// 2. ALMASHTIRGICH: system -> light -> dark -> system
// =====================================================================
console.log('\n=== 2. Almashtirgich aylanishi ===');
const ctx = await browser.newContext({
  colorScheme: 'dark',
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();
await page.goto(`${WEB}/uz`, { waitUntil: 'networkidle' });

const toggle = page.getByRole('button', { name: /Ko.rinish/i }).first();
check(await toggle.isVisible(), 'almashtirgich sarlavhada korinadi');

const state = async () => ({
  attr: await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
  stored: await page.evaluate(() => localStorage.getItem('barff-theme')),
  bright: await bodyBrightness(page),
});

await toggle.click();
let s = await state();
check(
  s.attr === 'light' && s.bright > 0.8,
  'birinchi bosishda YORUG',
  `${s.attr} ${s.bright.toFixed(3)}`,
);
check(s.stored === 'light', 'tanlov xotiraga yozildi', String(s.stored));

await toggle.click();
s = await state();
check(
  s.attr === 'dark' && s.bright < 0.2,
  'ikkinchi bosishda QORONGI',
  `${s.attr} ${s.bright.toFixed(3)}`,
);

await toggle.click();
s = await state();
check(
  s.attr === null && s.stored === 'system',
  'uchinchi bosishda TIZIMga qaytadi',
  String(s.attr),
);
// Tizim qorong'i so'ragani uchun fon yana qorong'i bo'lishi kerak.
check(s.bright < 0.2, 'tizimga qaytgach tizim afzalligi amal qiladi', s.bright.toFixed(3));

// =====================================================================
// 3. TANLOV ESLAB QOLINADI va FOUC YO'Q
// =====================================================================
console.log('\n=== 3. Eslab qolish va FOUC ===');
{
  // Tizim QORONG'I so'raydi, foydalanuvchi esa YORUG'ni tanlaydi —
  // ya'ni skript ishlamasa sahifa qorong'i chiqib, keyin oqarardi.
  await page.evaluate(() => localStorage.setItem('barff-theme', 'light'));

  /*
    FOUC o'lchovi: `commit` — javob sarlavhalari kelgan, lekin hali
    hech narsa chizilmagan payt. Shu nuqtadan keyin birinchi
    tekshiruvda atribut ALLAQACHON turgan bo'lishi kerak. Agar u
    faqat React yuklangach qo'yilsa, bu yerda `null` chiqardi.
  */
  await page.goto(`${WEB}/uz/products`, { waitUntil: 'commit' });
  const early = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check(early === 'light', 'atribut CHIZISHDAN OLDIN qoyilgan (FOUC yoq)', String(early));

  await page.waitForLoadState('domcontentloaded');
  const b = await bodyBrightness(page);
  check(b > 0.8, 'qayta yuklangach tanlov saqlanib qoldi', b.toFixed(3));
}

// =====================================================================
// 4. XOTIRA BLOKLANGAN BO'LSA — sayt baribir ishlaydi
// =====================================================================
console.log('\n=== 4. Xotira bloklangan holat ===');
{
  const blocked = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 1280, height: 800 },
  });
  await blocked.addInitScript(() => {
    // `localStorage` ga har qanday murojaat xato otadi — maxfiy rejim
    // va "sayt ma'lumotlari bloklangan" holatining taqlidi.
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('bloklangan');
      },
    });
  });
  const p = await blocked.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`${WEB}/uz`, { waitUntil: 'networkidle' });

  const b = await bodyBrightness(p);
  check(errors.length === 0, 'xotira bloklanganda sahifa xatosiz ochiladi', errors[0] ?? '');
  check(b < 0.2, 'zaxira holat — tizim afzalligi', b.toFixed(3));

  const t = p.getByRole('button', { name: /Ko.rinish/i }).first();
  await t.click();
  check((await bodyBrightness(p)) > 0.8, 'xotira yoq bolsa ham almashtirish ISHLAYDI');

  await blocked.close();
}

// =====================================================================
// 5. ADMIN PANEL ham ikkala korinishda
// =====================================================================
console.log('\n=== 5. Admin panel ===');
{
  for (const [scheme, wantLight] of [
    ['dark', false],
    ['light', true],
  ]) {
    const c = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1280, height: 800 },
    });
    const p = await c.newPage();
    await p.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
    const b = await bodyBrightness(p);
    check(wantLight ? b > 0.8 : b < 0.2, `admin kirish sahifasi '${scheme}'`, b.toFixed(3));
    await c.close();
  }
}

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
