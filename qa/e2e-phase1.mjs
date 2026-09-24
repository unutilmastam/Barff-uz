/*
  FAZA 1 ning UCHTA MUHIM OQIMI (CLAUDE.md §24).

  Bu skript ilovani BRAUZER orqali, haqiqiy foydalanuvchi kabi
  tekshiradi — API ni to'g'ridan-to'g'ri chaqirib emas.

  MUHIT HAQIDA IKKI OGOHLANTIRISH (ikkalasi ham o'lchab aniqlangan):

  1. `apps/admin` ni qayta qurgandan keyin `next start` jarayonini ham
     qayta ishga tushirish SHART. Eski jarayon HTML ichida eski
     chunk nomini beradi, u fayl diskda yo'q (400) va React
     gidratsiyasi butun sahifani xato ekraniga almashtiradi — forma
     serverdan kelgan HTML da bor, lekin brauzerda yo'q bo'lib qoladi.

  2. `POST /leads` da soatiga 5 ta cheklov bor. Bu TO'G'RI xatti-harakat
     (spamga qarshi), lekin sinovni takroran yurgizganda 429 beradi.
     API jarayonini qayta ishga tushirish hisobni nolga qaytaradi.
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
const API = 'http://localhost:3000/api/v1';

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const stamp = Date.now();
const company = `Faza1 Sinov ${stamp}`;

// =====================================================================
// 1. OMMAVIY B2B ARIZA
// =====================================================================
console.log('\n=== 1. Ommaviy B2B ariza ===');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  /*
    Javob STATUSI ham kuzatiladi. Faqat "muvaffaqiyat matni ko'rindimi"
    deb tekshirish kam: 429 (limit tugagan) holatida sinov
    "ilova buzilgan" degan noto'g'ri xulosa berardi.
  */
  let postStatus = 0;
  page.on('response', (res) => {
    if (res.url().endsWith('/leads') && res.request().method() === 'POST') {
      postStatus = res.status();
    }
  });

  await page.goto(`${WEB}/uz/become-partner`, { waitUntil: 'networkidle' });

  await page.getByLabel(/kompaniya nomi/i).fill(company);
  await page.getByLabel(/kontakt shaxs/i).fill('Faza Kontakt');
  await page.getByLabel(/^telefon/i).fill('+998 94 777 66 55');
  await page.getByLabel(/hudud/i).fill('Samarqand');
  await page.getByRole('combobox', { name: /faoliyat turi/i }).click();
  await page.waitForTimeout(250);
  await page.getByRole('option', { name: /ulgurji/i }).click();
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: /ariza yuborish/i }).click();
  await page.waitForTimeout(2500);

  const success = await page
    .getByText(/ariza qabul qilindi/i)
    .isVisible()
    .catch(() => false);
  check(success, 'tashrifchi ariza yubordi va tasdiq oldi', `POST /leads = ${postStatus}`);
  if (postStatus === 429) {
    console.log('   ESLATMA: limit tugagan — API ni qayta ishga tushiring.');
  }
  await ctx.close();
}

// =====================================================================
// 2. ADMIN KIRISHI VA ARIZANI KO'RISHI
// =====================================================================
console.log('\n=== 2. Admin kirishi va arizani korishi ===');
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await adminCtx.newPage();
{
  await admin.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
  await admin.locator('input[type="email"]').fill('admin@barff.uz');
  await admin.locator('input[type="password"]').fill('Admin-Lokal-Parol-2026');
  await admin.getByRole('button', { name: 'Kirish' }).click();
  await admin.waitForURL(`${ADMIN}/`, { timeout: 15000 });
  check(true, 'admin panelga kirdi');

  await admin.goto(`${ADMIN}/leads`, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(1200);

  const found = await admin.getByText(company).count();
  check(found > 0, 'yangi ariza admin panelda KORINDI', `${found} ta`);
}

// =====================================================================
// 3. ADMIN KONTENT TAHRIRI OMMAVIY SAYTDA KO'RINADI
// =====================================================================
console.log('\n=== 3. Admin tahriri saytda korinadi ===');
const slug = `faza1-${stamp}`;
{
  await admin.goto(`${ADMIN}/content/news`, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(900);

  await admin.getByRole('button', { name: 'Yangi qo‘shish' }).click();
  await admin.waitForTimeout(600);

  await admin.getByLabel('Slug').fill(slug);
  await admin.getByLabel(/Sarlavha — O'zbekcha/).fill('Faza 1 sinov yangiligi');
  await admin.getByLabel(/Matn — O'zbekcha/).fill('Bu matn admin paneldan kiritildi.');

  await admin.getByRole('combobox', { name: 'Holat' }).click();
  await admin.waitForTimeout(250);
  await admin.getByRole('option', { name: 'Nashr qilingan' }).click();
  await admin.waitForTimeout(250);

  await admin.getByRole('button', { name: 'Saqlash' }).click();
  await admin.waitForTimeout(2500);

  // Kesh bekor qilinganmi: ommaviy API darhol ko'rsatishi kerak.
  const res = await admin.request.get(`${API}/news/${slug}`);
  check(res.status() === 200, 'yangilik OMMAVIY API da darhol korinadi', `status=${res.status()}`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const site = await ctx.newPage();
  const nav = await site.goto(`${WEB}/uz/news/${slug}`, { waitUntil: 'domcontentloaded' });
  const heading = await site.locator('h1').first().textContent();
  check(
    (heading ?? '').includes('Faza 1'),
    'yangilik SAYTDA ochiladi',
    `${nav?.status()} · ${(heading ?? '').slice(0, 30)}`,
  );
  await ctx.close();
}

// Tozalash: sinov kontenti bazada qolmasligi kerak.
{
  await admin.goto(`${ADMIN}/content/news`, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(900);
  const row = admin.locator('tr', { hasText: 'Faza 1 sinov yangiligi' }).first();
  await row.getByRole('button', { name: 'O‘chirish' }).click();
  await admin.waitForTimeout(500);
  await admin.getByRole('button', { name: 'O‘chirish' }).last().click();
  await admin.waitForTimeout(1500);
  const left = await admin.getByText('Faza 1 sinov yangiligi').count();
  check(left === 0, 'sinov kontenti tozalandi', `${left} ta qoldi`);
}

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'UCHALA OQIM HAM OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
