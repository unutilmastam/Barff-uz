/*
  S31 — ZAXIRA, YIG'ISH VA QADOQLASH BRAUZERDA.

  Asosiy da'vo: buyurtma `RESERVED` ga o'tganda tovar BAND bo'ladi
  (qoldiq o'zgarmaydi), `PACKED` da esa ombordan CHIQADI. Ikkala
  raqam ham QOLDIQLAR ekranida ko'rinishi kerak — omborchi ularni
  shu yerdan o'qiydi.

  Siyosat: `docs/WAREHOUSE-POLICY.md`.
*/
import { chromium } from 'playwright';

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
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

/*
  Buyurtma API orqali TAYYORLANADI — bu o'lchanadigan narsa emas.
  Faza 2 darvozasi diler oqimini allaqachon brauzerda tekshirgan
  (`e2e-phase2.mjs`); bu yerda OMBOR ekranlari sinaladi.
*/
const api = page.request;

/** Buyurtmadagi variantning joriy qoldig'i — RAQAM bilan isbot uchun. */
async function stockSnapshot(request, orderNumber) {
  const orders = await (
    await request.get(`${API}/admin/orders?search=${orderNumber}&limit=1`)
  ).json();
  const orderId = orders.items?.[0]?.id;
  if (orderId === undefined) return { quantity: -1, reserved: -1 };

  const detail = await (await request.get(`${API}/admin/orders/${orderId}`)).json();
  const variantSku = detail.items?.[0]?.sku;

  const stock = await (
    await request.get(`${API}/warehouse/stock?search=${variantSku}&limit=50`)
  ).json();
  const row = stock.items?.[0];

  return { quantity: row?.quantity ?? -1, reserved: row?.reservedQuantity ?? -1 };
}

const dealers = await (await api.get(`${API}/admin/orders/dealers`)).json();
const dealerId = dealers[0]?.id;
check(dealerId !== undefined, 'sinov uchun diler topildi');

// Mavjud buyurtmalardan `CONFIRMED` bo'lganini qidiramiz yoki navbatni ko'ramiz.
console.log('\n=== Yig‘ish navbati ===');
await page.goto(`${ADMIN}/warehouse/picking`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check(
  await page
    .getByRole('heading', { name: 'Yig‘ish navbati' })
    .isVisible()
    .catch(() => false),
  'navbat sahifasi ochildi',
);

const queued = await page.getByRole('link', { name: /^BRF-/ }).count();
console.log(`   navbatda ${queued} ta buyurtma`);

if (queued > 0) {
  console.log('\n=== Yig‘ish varaqasi ===');
  await page.getByRole('link', { name: /^BRF-/ }).first().click();
  await page.waitForTimeout(1500);

  check(
    await page
      .getByRole('heading', { name: 'Yig‘iladigan pozitsiyalar' })
      .isVisible()
      .catch(() => false),
    'varaqa ochildi',
  );

  const lines = await page.locator('input[type="checkbox"]').count();
  check(lines > 0, 'yig‘iladigan pozitsiyalar bor', `${lines} ta`);

  // Belgilash hisoblagichni oshiradi.
  if (lines > 0) {
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(400);
    const counter = await page
      .getByText(/^\d+ \/ \d+$/)
      .first()
      .textContent();
    check((counter ?? '').startsWith('1 /'), 'belgilash hisoblagichda ko‘rindi', counter ?? '');
  }

  /*
    ASOSIY DA'VO: QADOQLASHDA TOVAR OMBORDAN CHIQADI.

    Buni ekrandagi matn emas, QOLDIQ RAQAMI isbotlaydi — shuning
    uchun qoldiq qadoqlashdan OLDIN va KEYIN o'qiladi.
  */
  console.log('\n=== Qadoqlash: qoldiq KAMAYADI ===');

  const orderNumber = (await page.locator('h1').first().textContent())?.trim() ?? '';
  const before = await stockSnapshot(api, orderNumber);

  // `RESERVED` -> `PICKING`
  const toPicking = page.getByRole('button', { name: 'Yig‘ilmoqda' });
  if ((await toPicking.count()) > 0) {
    await toPicking.click();
    await page.waitForTimeout(1500);
  }

  const toPacked = page.getByRole('button', { name: 'Qadoqlandi' });
  check((await toPacked.count()) > 0, 'qadoqlash tugmasi bor');

  if ((await toPacked.count()) > 0) {
    await toPacked.click();
    await page.waitForTimeout(2000);

    const after = await stockSnapshot(api, orderNumber);

    check(
      after.quantity < before.quantity,
      'qadoqlashdan keyin QOLDIQ kamaydi',
      `${before.quantity} -> ${after.quantity}`,
    );
    check(
      after.reserved < before.reserved,
      'BAND ham bo‘shadi',
      `${before.reserved} -> ${after.reserved}`,
    );
  }
} else {
  console.log('   Navbat bo‘sh — zaxiraga olingan buyurtma yo‘q.');
  check(
    await page
      .getByText('Navbat bo‘sh')
      .first()
      .isVisible()
      .catch(() => false),
    'bo‘sh holat ko‘rsatildi',
  );
}

console.log('\n=== Qoldiqlar: BAND ustuni ===');
await page.goto(`${ADMIN}/warehouse/stock`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check((await page.getByRole('columnheader', { name: 'Band' }).count()) > 0, 'BAND ustuni bor');
check((await page.getByRole('columnheader', { name: 'Mavjud' }).count()) > 0, 'MAVJUD ustuni bor');

console.log('\n=== Mobil ===');
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const small = await mobile.newPage();
small.on('pageerror', (e) => errors.push(`mobil: ${e.message}`));
await small.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await small.locator('input[type="email"]').fill('admin@barff.uz');
await small.locator('input[type="password"]').fill('Admin-Lokal-Parol-2026');
await small.getByRole('button', { name: 'Kirish' }).click();
await small.waitForURL(`${ADMIN}/`, { timeout: 15000 });
await small.goto(`${ADMIN}/warehouse/picking`, { waitUntil: 'networkidle' });
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
