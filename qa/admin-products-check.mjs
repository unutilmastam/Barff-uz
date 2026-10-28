/*
  ADMIN MAHSULOT MUHARRIRI TEKSHIRUVI (A01).

  Zavod egasi hamma narsani admin paneldan o'zi kiritadi, shuning uchun
  zanjir BRAUZERDA, haqiqiy foydalanuvchi kabi yuriladi:

    kategoriya yaratish -> mahsulot yaratish -> variant + narx
    -> rasm yuklash -> narx o'zgartirish (tarix) -> saytga chiqarish

  Natija API orqali ham tekshiriladi (ekran keshdan kelgan bo'lishi
  mumkin). Oxirida yaratilgan hamma narsa o'chiriladi.

    ADMIN_PASSWORD="..." node qa/admin-products-check.mjs
*/
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const IMAGE = fileURLToPath(
  new URL('../apps/web/public/cutouts/apelsin-sharbati-350.webp', import.meta.url),
);

if (ADMIN_PASSWORD === undefined) {
  console.error('XATO: `ADMIN_PASSWORD` berilishi shart (CLAUDE.md §12).');
  process.exit(2);
}

const stamp = Date.now();
const problems = [];
let failed = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok ? '' : ` — ${extra}`}`);
  if (!ok) failed += 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/v1/')) {
    problems.push(`HTTP ${r.status()} ${r.url().replace(API, '')}`);
  }
});

const api = async (path, init) => (await page.request.fetch(`${API}${path}`, init)).json();
let categoryId = null;
let productId = null;

try {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20000 });
  check(true, 'admin panelga kirdi');

  // 1. Kategoriya
  console.log('\n=== 1. Kategoriya ===');
  await page.goto(`${ADMIN_URL}/products/categories`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Yangi qo‘shish' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nomi').first().fill(`QA Sharbat ${stamp}`);
  const slugValue = await dialog.getByLabel('Slug').inputValue();
  check(slugValue === `qa-sharbat-${stamp}`, 'slug nomdan avtomatik to‘ldi', slugValue);
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await page.getByText(`QA Sharbat ${stamp}`).first().waitFor({ timeout: 10000 });
  check(true, 'kategoriya ro‘yxatda ko‘rindi');

  const cats = await api('/admin/categories?limit=100');
  categoryId = cats.items.find((c) => c.slug === `qa-sharbat-${stamp}`)?.id ?? null;
  check(categoryId !== null, 'kategoriya serverda mavjud');

  // 2. Mahsulot
  console.log('\n=== 2. Mahsulot ===');
  await page.goto(`${ADMIN_URL}/products/new`, { waitUntil: 'networkidle' });
  await page.getByLabel('Kategoriya').click();
  await page.getByRole('option', { name: `QA Sharbat ${stamp}` }).click();
  await page.getByLabel('Nomi').first().fill(`QA Olma ${stamp}`);
  check(
    (await page.getByLabel('Manzil (slug)').inputValue()) === `qa-olma-${stamp}`,
    'mahsulot slugi avtomatik',
  );
  check(
    (await page.getByLabel('Artikul (SKU)').inputValue()) === `QA-OLMA-${stamp}`,
    'SKU avtomatik',
  );
  await page.getByRole('button', { name: 'Yaratish' }).click();
  await page.waitForURL(/\/products\/[0-9a-f-]{36}$/, { timeout: 15000 });
  productId = page.url().split('/').pop();
  check(true, 'mahsulot yaratildi va muharrir ochildi');

  // 3. Variant + narx
  console.log('\n=== 3. Variant va narx ===');
  const newRow = page.locator('h3:has-text("Yangi variant") + ul li');
  await newRow.getByLabel('Hajm (ml)').fill('1000');
  check(
    (await newRow.getByLabel('Artikul (SKU)').inputValue()) === `QA-OLMA-${stamp}-1000`,
    'variant SKU hajmga qarab to‘ldi',
  );
  await newRow.getByLabel('Narx (so‘m)').fill('18 000');
  await newRow.getByRole('button', { name: 'Variant qo‘shish' }).click();
  await page.getByText('Hozir: 18').first().waitFor({ timeout: 10000 });
  check(true, 'variant narxi bilan qo‘shildi');

  let detail = await api(`/admin/products/${productId}`);
  check(detail.variants.length === 1, 'serverda 1 ta variant');
  check(
    detail.variants[0].currentPrice?.amount === 1_800_000,
    'narx 1 800 000 tiyin',
    JSON.stringify(detail.variants[0].currentPrice),
  );

  // Noto'g'ri narx rad etiladi
  const row = page
    .locator('ul > li')
    .filter({ has: page.getByLabel('Hajm (ml)') })
    .first();
  await row.getByLabel('Narx (so‘m)').fill('12.345');
  await row.getByRole('button', { name: 'Saqlash' }).click();
  await page.getByRole('alert').filter({ hasText: 'Narx noto‘g‘ri' }).waitFor({ timeout: 5000 });
  check(true, 'noto‘g‘ri narx rad etildi');

  // Narx o'zgartirish -> tarix
  await row.getByLabel('Narx (so‘m)').fill('20000,50');
  await row.getByRole('button', { name: 'Saqlash' }).click();
  await row.getByText('Saqlandi').waitFor({ timeout: 10000 });
  detail = await api(`/admin/products/${productId}`);
  check(detail.variants[0].currentPrice?.amount === 2_000_050, 'yangi narx 2 000 050 tiyin');
  check(detail.variants[0].prices.length === 2, 'narx tarixi 2 ta yozuv');

  // 4. Rasm
  console.log('\n=== 4. Rasm ===');
  await page.locator('input[type="file"]').setInputFiles(IMAGE);
  await page.getByText('Asosiy', { exact: true }).waitFor({ timeout: 20000 });
  const img = page.locator('ul li img').first();
  await img.waitFor({ timeout: 10000 });
  const natural = await img.evaluate((el) => el.complete && el.naturalWidth);
  check(natural > 0, 'yuklangan rasm ko‘rinadi (yuklandi)', String(natural));
  detail = await api(`/admin/products/${productId}`);
  check(detail.images.length === 1 && detail.images[0].isPrimary, 'birinchi rasm avtomatik asosiy');

  // 5. Saytga chiqarish
  console.log('\n=== 5. Saytga chiqarish ===');
  await page.getByLabel('Saytda ko‘rinsin').first().click();
  // Variant qatorlarida ham "Saqlandi" bor — shuning uchun javobning o'zini kutamiz.
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().endsWith(`/admin/products/${productId}`),
  );
  await page.getByRole('button', { name: 'Saqlash' }).first().click();
  check((await saved).status() === 200, 'mahsulot saytga chiqarildi (PATCH 200)');
  const pub = await api(`/products/qa-olma-${stamp}`);
  check(pub.slug === `qa-olma-${stamp}`, 'ommaviy API da mahsulot bor');
  check(
    pub.variants?.[0]?.price?.amount === 2_000_050,
    'ommaviy narx yangi',
    JSON.stringify(pub.variants?.[0]?.price),
  );
  check((pub.images?.length ?? 0) === 1, 'ommaviy API da rasm bor');

  // Ro'yxat sahifasi
  await page.goto(`${ADMIN_URL}/products`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: `QA Olma ${stamp}` }).waitFor();
  check(true, 'ro‘yxatda mahsulot ko‘rinadi');
  const thumb = await page
    .locator('tr', { hasText: `QA Olma ${stamp}` })
    .locator('img')
    .evaluate((el) => el.complete && el.naturalWidth);
  check(thumb > 0, 'ro‘yxatda kichik rasm ochildi', String(thumb));

  // 6. A11y + mobil + tema
  console.log('\n=== 6. Qulaylik ===');
  for (const [name, theme, viewport] of [
    ['muharrir-light', 'light', { width: 1440, height: 1000 }],
    ['muharrir-dark', 'dark', { width: 1440, height: 1000 }],
    ['muharrir-mobil', 'light', { width: 390, height: 844 }],
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${ADMIN_URL}/products/${productId}`, { waitUntil: 'networkidle' });
    await page.getByText('Variantlar va narxlar').waitFor();
    await page.waitForTimeout(600);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    check(violations.length === 0, `axe ${name}`, violations.map((v) => `${v.id}`).join(','));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `${name}: gorizontal skroll yo‘q`, `${overflow}px`);
  }
} catch (error) {
  check(false, 'skript yiqildi', String(error).split('\n')[0]);
  await page
    .screenshot({ path: '/tmp/claude-0/admin-products-fail.png', fullPage: true })
    .catch(() => {});
} finally {
  // Tozalash
  if (productId !== null)
    await page.request.delete(`${API}/admin/products/${productId}`).catch(() => {});
  if (categoryId !== null)
    await page.request.delete(`${API}/admin/categories/${categoryId}`).catch(() => {});
  await browser.close();
}

console.log('\n=== Konsol/tarmoq muammolari ===');
const unique = [...new Set(problems)];
check(unique.length === 0, 'konsol va API xatolari yo‘q', unique.join(' | '));
console.log(failed === 0 ? '\nHAMMASI O‘TDI' : `\n${failed} TA TEKSHIRUV YIQILDI`);
process.exit(failed === 0 ? 0 : 1);
