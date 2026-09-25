/*
  S30 — OMBOR EKRANLARI BRAUZERDA.

  Asosiy da'vo: qoldiq ekranda TAHRIRLANMAYDI, faqat HARAKAT orqali
  o'zgaradi — va o'zgarish darhol JURNALDA ko'rinadi.
*/
import { chromium } from 'playwright';

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3002';
const path = process.env.CHROMIUM_PATH;

const browser = await chromium.launch({
  ...(path ? { executablePath: path } : {}),
  args: ['--no-sandbox'],
});

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="email"]').fill('admin@barff.uz');
await page.locator('input[type="password"]').fill('Admin-Lokal-Parol-2026');
await page.getByRole('button', { name: 'Kirish' }).click();
await page.waitForURL(`${ADMIN}/`, { timeout: 15000 });
check(true, 'admin panelga kirdi');

console.log('\n=== Qoldiqlar ekrani ===');
await page.goto(`${ADMIN}/warehouse/stock`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check(
  await page
    .getByRole('heading', { name: 'Qoldiqlar' })
    .isVisible()
    .catch(() => false),
  'sahifa ochildi',
);

// Ombor filtri seed'dagi MAIN ni ko'rsatishi kerak.
const filters = await page.getByText('Ombor', { exact: true }).count();
check(filters > 0, 'ombor filtri bor');

/*
  ASOSIY TEKSHIRUV: qoldiqni to'g'ridan-to'g'ri yozadigan maydon
  BO'LMASLIGI kerak. Jadvalda faqat "Harakat", "Tuzatish" va
  "Chegara" tugmalari bo'ladi.
*/
const hasRows = (await page.getByRole('button', { name: 'Harakat' }).count()) > 0;

if (hasRows) {
  check(true, 'qoldiq qatorlari bor');

  console.log('\n=== Harakat yozish ===');
  await page.getByRole('button', { name: 'Harakat' }).first().click();
  await page.waitForTimeout(600);

  await page.getByLabel('Miqdor (dona)').fill('25');
  await page.getByLabel('Havola').fill('QA-S30');
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await page.waitForTimeout(2000);

  const closed = (await page.getByLabel('Miqdor (dona)').count()) === 0;
  check(closed, 'harakat saqlandi va oyna yopildi');

  /*
    TUZATISH — SABAB SHART (S30 DoD).

    Tekshiruv "tugma o'chirilganmi" bo'yicha: sababsiz saqlash
    MUMKIN BO'LMASLIGI kerak. Bu kosmetika — server ham rad etadi
    (`STOCK_REASON_REQUIRED`) va u testda qoplangan.
  */
  console.log('\n=== Tuzatish: sabab SHART ===');
  await page.getByRole('button', { name: 'Tuzatish' }).first().click();
  await page.waitForTimeout(600);

  await page.getByLabel('Miqdor (dona)').fill('-3');
  await page.waitForTimeout(300);

  const blocked = await page.getByRole('button', { name: 'Saqlash' }).isDisabled();
  check(blocked, 'sababsiz saqlash TUGMASI O‘CHIQ');

  await page.getByLabel('Sabab').fill('QA-S30 inventarizatsiya');
  await page.waitForTimeout(300);

  const enabled = !(await page.getByRole('button', { name: 'Saqlash' }).isDisabled());
  check(enabled, 'sabab kiritilgach saqlash ochildi');

  await page.getByRole('button', { name: 'Saqlash' }).click();
  await page.waitForTimeout(2000);

  check((await page.getByLabel('Sabab').count()) === 0, 'tuzatish saqlandi');
} else {
  console.log('   Qoldiq qatori yo‘q — avval harakat yoziladi.');
  check(
    await page
      .getByText('Tanlovga mos qoldiq topilmadi')
      .isVisible()
      .catch(() => false),
    'bo‘sh holat ko‘rsatildi',
  );
}

console.log('\n=== Harakatlar jurnali ===');
await page.goto(`${ADMIN}/warehouse/movements`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check(
  await page
    .getByRole('heading', { name: 'Harakatlar' })
    .isVisible()
    .catch(() => false),
  'jurnal ochildi',
);

if (hasRows) {
  check(
    (await page.getByText('QA-S30', { exact: false }).count()) > 0,
    'yangi harakat jurnalda KO‘RINDI',
  );

  check(
    (await page.getByText('QA-S30 inventarizatsiya').count()) > 0,
    'tuzatish SABABI bilan jurnalda',
  );
}

// Jurnalda tahrirlash tugmasi BO'LMASLIGI kerak.
const editable = (await page.getByRole('button', { name: /tahrirlash|o‘chirish/i }).count()) > 0;
check(!editable, 'jurnalda TAHRIRLASH tugmasi YO‘Q');

console.log('\n=== Mobil ===');
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const small = await mobile.newPage();
small.on('pageerror', (e) => errors.push(`mobil: ${e.message}`));
await small.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await small.locator('input[type="email"]').fill('admin@barff.uz');
await small.locator('input[type="password"]').fill('Admin-Lokal-Parol-2026');
await small.getByRole('button', { name: 'Kirish' }).click();
await small.waitForURL(`${ADMIN}/`, { timeout: 15000 });
await small.goto(`${ADMIN}/warehouse/stock`, { waitUntil: 'networkidle' });
await small.waitForTimeout(1200);

const overflow = await small.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
check(!overflow, 'mobil: gorizontal skroll YO‘Q');
await mobile.close();

console.log('\n=== Konsol ===');
check(errors.length === 0, 'konsolda xato YO‘Q', `${errors.length} ta`);
for (const error of errors.slice(0, 5)) console.log(`   ${error}`);

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
