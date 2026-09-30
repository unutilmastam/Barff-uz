/*
  S36 — MOLIYA EKRANLARI BRAUZERDA.

  Asosiy da'volar (`docs/BILLING-POLICY.md`):

  1. Hisob-faktura FAQAT yetkazilgan buyurtmadan beriladi va
     tanlovda ham faqat shundaylari ko'rinadi.
  2. QORALAMA dilerga KO'RSATILMAYDI.
  3. To'lovdan keyin hujjat holati va QARZ RAQAMI o'zgaradi.
  4. CSV yuklab olinadi va summalar TIYINDA chiqadi.

  Tayyorgarlik: `STAFF_PASSWORD=... node qa/seed-staff.mjs`.
*/
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3002';
const DEALER = process.env.DEALER_URL ?? 'http://localhost:3003';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const OUT = process.env.OUT;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

if (ADMIN_PASSWORD === undefined || STAFF_PASSWORD === undefined) {
  console.error('XATO: `ADMIN_PASSWORD` va `STAFF_PASSWORD` shart (CLAUDE.md §12).');
  process.exit(2);
}

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

const problems = [];

async function open(url, email, password, tag, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && problems.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      problems.push(`${tag}: ${r.status()} ${r.url()}`);
    }
  });

  await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL(`${url}/`, { timeout: 20000 });

  return { ctx, page };
}

const admin = await open(ADMIN, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
check(true, 'admin panelga kirdi');

// ---------------------------------------------------------------- hisob-faktura
await admin.page.goto(`${ADMIN}/finance/invoices`, { waitUntil: 'networkidle' });
await admin.page.waitForTimeout(1500);
await admin.page.screenshot({ path: `${OUT}/1-hisob-fakturalar.png`, fullPage: true });
console.log('1-hisob-fakturalar');

check(
  (await admin.page.getByRole('heading', { name: 'Hisob-fakturalar' }).count()) > 0,
  'hisob-fakturalar sahifasi ochildi',
);

/*
  TANLOVDA FAQAT YETKAZILGAN VA HUJJATSIZ BUYURTMALAR.

  Bo'lmaydigan tanlovni ko'rsatib, keyin `409` bilan rad etish
  foydalanuvchini bekorga ishlatardi.
*/
await admin.page.getByRole('button', { name: 'Hisob-faktura berish' }).click();
await admin.page.waitForTimeout(2000);
await admin.page.screenshot({ path: `${OUT}/2-hisob-faktura-berish.png` });

const dialog = admin.page.locator('[role="dialog"]');
const hasSelect = (await dialog.getByLabel('Buyurtma').count()) > 0;
const hasEmpty = (await dialog.getByText(/YETKAZILGAN/).count()) > 0;
check(hasSelect || hasEmpty, 'tanlov yoki SABAB korsatildi', hasSelect ? 'tanlov' : 'bo‘sh holat');

let created = null;

if (hasSelect) {
  await dialog.getByLabel('Buyurtma').click();
  await admin.page.waitForTimeout(600);
  const option = admin.page.getByRole('option').first();
  const label = await option.textContent();
  await option.click();
  await admin.page.waitForTimeout(400);

  await admin.page.getByRole('button', { name: 'Yaratish' }).click();
  await admin.page.waitForTimeout(2500);
  await admin.page.screenshot({ path: `${OUT}/3-yaratildi.png`, fullPage: true });

  const list = await (
    await admin.page.request.get(`${API}/billing/invoices?limit=20&status=DRAFT`)
  ).json();
  created = (list.items ?? [])[0] ?? null;
  check(created !== null, 'QORALAMA hisob-faktura yaratildi', created?.number ?? label ?? '');
} else {
  await admin.page.getByRole('button', { name: 'Bekor qilish' }).click();
}

// ---------------------------------------------------------------- tafsilot
if (created !== null) {
  await admin.page.goto(`${ADMIN}/finance/invoices/${created.id}`, { waitUntil: 'networkidle' });
  await admin.page.waitForTimeout(1500);
  await admin.page.screenshot({ path: `${OUT}/4-qoralama.png`, fullPage: true });

  check(
    (await admin.page.getByText(/hali BERILMAGAN/).count()) > 0,
    'qoralama ekanligi OCHIQ aytilgan',
  );

  // Soliq qatori KO'RSATILADI va u nol (Q17).
  check(
    (await admin.page.getByText(/QQS kutilmoqda/).count()) > 0,
    'soliq qatori korsatilgan va u KUTILMOQDA deb belgilangan',
  );

  await admin.page.getByRole('button', { name: 'Berish' }).click();
  await admin.page.waitForTimeout(2500);
  await admin.page.screenshot({ path: `${OUT}/5-berildi.png`, fullPage: true });

  const issued = await (
    await admin.page.request.get(`${API}/billing/invoices/${created.id}`)
  ).json();
  check(issued.status === 'ISSUED', 'hujjat BERILDI', issued.status);
  check(issued.outstanding === issued.total, 'qarz = jami', `${issued.outstanding}`);
}

// ---------------------------------------------------------------- to'lov
await admin.page.goto(`${ADMIN}/finance/payments`, { waitUntil: 'networkidle' });
await admin.page.waitForTimeout(1500);
await admin.page.screenshot({ path: `${OUT}/6-tolovlar.png`, fullPage: true });
console.log('6-tolovlar');

if (created !== null) {
  const before = await (
    await admin.page.request.get(`${API}/billing/dealers/${created.dealer.id}/balance`)
  ).json();

  await admin.page.getByRole('button', { name: 'To‘lov yozish' }).click();
  await admin.page.waitForTimeout(1200);

  const form = admin.page.locator('[role="dialog"]');
  await form.getByLabel('Diler').click();
  await admin.page.waitForTimeout(500);
  await admin.page.getByRole('option', { name: created.dealer.companyName }).first().click();
  await admin.page.waitForTimeout(400);

  /*
    FOYDALANUVCHI SO'MDA KIRITADI, SERVER TIYINDA OLADI.

    Aylantirish faqat formada bo'ladi va u butun songa
    yaxlitlanadi (`docs/BILLING-POLICY.md` §1).
  */
  const majorHalf = Math.floor(created.total / 2) / 100;
  await form.getByLabel('Summa (so‘m)').fill(String(majorHalf));
  await admin.page.screenshot({ path: `${OUT}/7-tolov-oynasi.png` });

  await admin.page.getByRole('button', { name: 'Saqlash' }).click();
  await admin.page.waitForTimeout(2500);
  await admin.page.screenshot({ path: `${OUT}/8-tolov-yozildi.png`, fullPage: true });

  const after = await (
    await admin.page.request.get(`${API}/billing/dealers/${created.dealer.id}/balance`)
  ).json();

  const paidDelta = after.paid - before.paid;
  check(paidDelta === Math.round(majorHalf * 100), 'tolov TIYINDA yozildi', `${paidDelta}`);
  check(
    after.outstanding === before.outstanding - paidDelta,
    'QARZ aynan tolov miqdoricha kamaydi',
    `${before.outstanding} -> ${after.outstanding}`,
  );

  const invoice = await (
    await admin.page.request.get(`${API}/billing/invoices/${created.id}`)
  ).json();
  check(
    invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PAID',
    'hujjat holati TAQSIMOTDAN yangilandi',
    invoice.status,
  );
}

// ---------------------------------------------------------------- CSV
const csv = await admin.page.request.get(`${API}/billing/exports/invoices.csv`);
check(csv.ok(), 'CSV yuklab olindi', String(csv.status()));

if (csv.ok()) {
  const text = await csv.text();
  check(text.includes('jami_tiyin'), 'CSV sarlavhasida TIYIN ochiq yozilgan');
  check(text.charCodeAt(0) === 0xfeff, 'CSV da BOM bor (Excel uchun)');
}

// ---------------------------------------------------------------- diler
const dealer = await open(DEALER, 'qa3-diler@barff.uz', STAFF_PASSWORD, 'diler', {
  width: 390,
  height: 844,
});
check(true, 'diler portalga kirdi');

await dealer.page.goto(`${DEALER}/invoices`, { waitUntil: 'networkidle' });
await dealer.page.waitForTimeout(2000);
await dealer.page.screenshot({ path: `${OUT}/9-diler-hisob-fakturalar.png`, fullPage: true });

await dealer.page.goto(`${DEALER}/balance`, { waitUntil: 'networkidle' });
await dealer.page.waitForTimeout(2000);
await dealer.page.screenshot({ path: `${OUT}/10-diler-balans.png`, fullPage: true });
console.log('10-diler-balans');

check(
  (await dealer.page.getByRole('heading', { name: 'Balans va to‘lovlar' }).count()) > 0,
  'diler balans sahifasini KORDI',
);

// ---------------------------------------------------------------- qulaylik
for (const [name, ctx, url] of [
  ['hisob-fakturalar', admin, `${ADMIN}/finance/invoices`],
  ['tolovlar', admin, `${ADMIN}/finance/payments`],
  ['diler-balans', dealer, `${DEALER}/balance`],
]) {
  await ctx.page.goto(url, { waitUntil: 'networkidle' });
  await ctx.page.waitForTimeout(1200);

  const { violations } = await new AxeBuilder({ page: ctx.page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  console.log(`axe ${name}: ${violations.length} buzilish`);
  for (const v of violations) problems.push(`axe ${name}: ${v.id} — ${v.help}`);

  const overflow = await ctx.page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) problems.push(`${name}: ${overflow}px gorizontal skroll`);
}

console.log(problems.length === 0 ? '\nXATO YO‘Q' : `\nXATOLAR:\n${problems.join('\n')}`);
if (problems.length > 0) failures += 1;

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
