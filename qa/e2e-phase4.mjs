/*
  FAZA 4 DARVOZASI (ROADMAP.md S39).

  Shart: "yetkazilgan buyurtma -> hisob-faktura -> to'lov -> balans
  -> hisobot" zanjiri va u BAZA bilan YARASHADI.

  Bu skript Faza 3 zanjirining ARTIGIDAN boshlanadi: `e2e-phase3.mjs`
  buyurtmani YETKAZILGAN holatga olib boradi, bu yerda esa moliya
  tomoni — HAR BIR QADAM O'Z ROLI bilan:

    admin    -> hisob-faktura yaratadi, beradi, to'lov yozadi
    diler    -> QORALAMANI ko'rmaydi; berilganini va balansini ko'radi
    admin    -> hisobot, audit jurnali

  RAQAMLAR API'DAN, ekrandan emas (ekran keshdan kelgan bo'lishi
  mumkin). Yakuniy yarashtirish BAZADAN: `reconcile-phase4.mjs`.

  TAYYORGARLIK:

    STAFF_PASSWORD="..." node qa/seed-staff.mjs
    ADMIN_PASSWORD="..." STAFF_PASSWORD="..." node qa/e2e-phase3.mjs

  Muhit tuzoqlari — `qa/README.md`.
*/
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const DEALER_URL = process.env.DEALER_URL ?? 'http://localhost:3003';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;
const DEALER_EMAIL = 'qa3-diler@barff.uz';

if (ADMIN_PASSWORD === undefined || STAFF_PASSWORD === undefined) {
  console.error('XATO: `ADMIN_PASSWORD` va `STAFF_PASSWORD` berilishi shart (CLAUDE.md §12).');
  process.exit(2);
}

const chromiumPath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch({
  ...(chromiumPath ? { executablePath: chromiumPath } : {}),
  args: ['--no-sandbox'],
});

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const problems = [];

async function step(label, run) {
  try {
    await run();
  } catch (error) {
    check(false, label, String(error).split('\n')[0].slice(0, 160));
  }
}

async function open(url, email, password, tag, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && problems.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/v1/')) {
      problems.push(`${tag}: HTTP ${r.status()} ${r.url().replace(API, '')}`);
    }
  });

  await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL(`${url}/`, { timeout: 20000 });

  return { ctx, page };
}

const getJson = async (ctx, path) => (await ctx.page.request.get(`${API}${path}`)).json();

const admin = await open(ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
check(true, 'admin panelga kirdi');

// =====================================================================
// 0. HUJJATSIZ YETKAZILGAN BUYURTMA
// =====================================================================
console.log('\n=== 0. Yetkazilgan, hujjatsiz buyurtma ===');
let order = null;

await step('buyurtma topish qadami bajarildi', async () => {
  const wanted = process.env.ORDER_NUMBER;
  const list = await getJson(admin, `/admin/orders?status=DELIVERED&limit=100`);
  const invoices = JSON.stringify(await getJson(admin, `/billing/invoices?limit=100`));

  const candidates = (list.items ?? []).filter(
    (row) =>
      (wanted === undefined ? true : row.number === wanted) &&
      !invoices.includes(row.id) &&
      /QA Faza3/.test(JSON.stringify(row.dealer ?? row)),
  );

  check(candidates.length > 0, 'hujjatsiz YETKAZILGAN buyurtma bor', candidates[0]?.number ?? '—');
  if (candidates.length === 0) return;

  order = await getJson(admin, `/admin/orders/${candidates[0].id}`);
});

if (order === null) {
  console.log('\nBuyurtma yoq: avval `e2e-phase3.mjs` ni yurgizing.');
  await browser.close();
  console.log(`\nNATIJA: ${failures} ta muammo`);
  process.exit(1);
}

const dealerId = order.dealerId ?? order.dealer?.id;
const day = new Date().toISOString().slice(0, 10);
const reportQuery = `from=${day}&to=${day}&limit=5000`;

const salesBefore = await getJson(admin, `/reports/sales?${reportQuery}`);
const balanceBefore = await getJson(admin, `/billing/dealers/${dealerId}/balance`);
console.log(
  `   buyurtma ${order.number}: jami ${order.total} tiyin; ` +
    `diler qarzi ${balanceBefore.outstanding}, tolangan ${balanceBefore.paid}`,
);

// =====================================================================
// 1. HISOB-FAKTURA: ADMIN YARATADI VA BERADI
// =====================================================================
console.log('\n=== 1. Hisob-faktura ===');
let invoice = null;

await step('hisob-faktura qadami bajarildi', async () => {
  await admin.page.goto(`${ADMIN_URL}/finance/invoices`, { waitUntil: 'networkidle' });
  await admin.page.waitForTimeout(1200);
  await admin.page.getByRole('button', { name: 'Hisob-faktura berish' }).click();
  await admin.page.waitForTimeout(1500);

  const dialog = admin.page.locator('[role="dialog"]');
  await dialog.getByLabel('Buyurtma').click();
  await admin.page.waitForTimeout(500);

  const option = admin.page.getByRole('option', { name: new RegExp(order.number) });
  check((await option.count()) > 0, 'AYNAN shu buyurtma tanlovda bor', order.number);
  if ((await option.count()) === 0) return;

  await option.first().click();
  await admin.page.getByRole('button', { name: 'Yaratish' }).click();
  await admin.page.waitForTimeout(2200);

  const list = await getJson(admin, `/billing/invoices?limit=100&status=DRAFT`);
  invoice = (list.items ?? []).find((row) => JSON.stringify(row).includes(order.id)) ?? null;
  check(invoice !== null, 'QORALAMA yaratildi', invoice?.number ?? '—');
  if (invoice === null) return;

  check(invoice.total === order.total, 'hujjat jami = buyurtma jami', `${invoice.total}`);
});

if (invoice === null) {
  await browser.close();
  console.log(`\nNATIJA: ${failures} ta muammo`);
  process.exit(1);
}

// QORALAMA — dilerga KO'RINMAYDI.
const dealerUi = await open(DEALER_URL, DEALER_EMAIL, STAFF_PASSWORD, 'diler', {
  width: 390,
  height: 844,
});
check(true, 'diler portalga kirdi');

await step('qoralama dilerga korinmasligi tekshirildi', async () => {
  const mine = await getJson(dealerUi, `/dealer/invoices?limit=100`);
  check(
    !JSON.stringify(mine).includes(invoice.number),
    'QORALAMA dilerning royxatida YOQ',
    invoice.number,
  );

  const direct = await dealerUi.page.request.get(`${API}/dealer/invoices/${invoice.id}`);
  check(direct.status() === 404, 'qoralamani id bilan ham ochib bolmaydi', String(direct.status()));
});

await step('hujjat berish qadami bajarildi', async () => {
  await admin.page.goto(`${ADMIN_URL}/finance/invoices/${invoice.id}`, {
    waitUntil: 'networkidle',
  });
  await admin.page.waitForTimeout(1200);
  await admin.page.getByRole('button', { name: 'Berish' }).click();
  await admin.page.waitForTimeout(2200);

  const issued = await getJson(admin, `/billing/invoices/${invoice.id}`);
  check(issued.status === 'ISSUED', 'hujjat BERILDI', issued.status);
  check(issued.outstanding === issued.total, 'qarz = jami', `${issued.outstanding}`);
  invoice = issued;
});

await step('diler berilgan hujjatni va balansini korishi tekshirildi', async () => {
  const mine = await getJson(dealerUi, `/dealer/invoices?limit=100`);
  check(JSON.stringify(mine).includes(invoice.number), 'BERILGAN hujjat dilerda KORINDI');

  await dealerUi.page.goto(`${DEALER_URL}/invoices`, { waitUntil: 'networkidle' });
  await dealerUi.page.waitForTimeout(1500);
  check(
    (await dealerUi.page.getByText(invoice.number).count()) > 0,
    'dilerning EKRANIDA hujjat raqami bor',
  );

  const balance = await getJson(dealerUi, `/dealer/balance`);
  check(
    balance.outstanding === balanceBefore.outstanding + invoice.total,
    'diler qarzi hujjat jamiga OSHDI',
    `${balanceBefore.outstanding} -> ${balance.outstanding}`,
  );
});

// =====================================================================
// 2. TOLOV: AVVAL QISMAN, KEYIN QOLGANI
// =====================================================================
console.log('\n=== 2. Tolov ===');

async function pay(amountTiyin) {
  await admin.page.goto(`${ADMIN_URL}/finance/payments`, { waitUntil: 'networkidle' });
  await admin.page.waitForTimeout(1200);
  await admin.page.getByRole('button', { name: 'To‘lov yozish' }).click();
  await admin.page.waitForTimeout(1000);

  const form = admin.page.locator('[role="dialog"]');
  await form.getByLabel('Diler').click();
  await admin.page.waitForTimeout(400);
  await admin.page.getByRole('option', { name: invoice.dealer.companyName }).first().click();
  await form.getByLabel('Summa (so‘m)').fill(String(amountTiyin / 100));
  await admin.page.getByRole('button', { name: 'Saqlash' }).click();
  await admin.page.waitForTimeout(2200);
}

const partial = Math.floor(invoice.total / 2 / 100) * 100;
let afterPartial = null;

await step('qisman tolov qadami bajarildi', async () => {
  const before = await getJson(admin, `/billing/dealers/${dealerId}/balance`);
  await pay(partial);
  afterPartial = await getJson(admin, `/billing/dealers/${dealerId}/balance`);

  check(afterPartial.paid - before.paid === partial, 'tolov TIYINDA yozildi', `${partial}`);
  check(
    afterPartial.outstanding === before.outstanding - partial,
    'QARZ aynan tolov miqdoricha kamaydi',
    `${before.outstanding} -> ${afterPartial.outstanding}`,
  );
});

await step('qisman tolovdan keyingi hujjat holati tekshirildi', async () => {
  const payments = await getJson(admin, `/billing/payments?limit=1`);
  const allocations = payments.items?.[0]?.allocations ?? [];
  check(allocations.length > 0, 'tolov AVTOMATIK taqsimlandi', `${allocations.length} ta hujjat`);

  // Taqsimot ESKISIDAN boshlanadi (BILLING-POLICY §6): bizning hujjat qisman yopilgan bo'lishi
  // mumkin yoki eskisi yopilgan — ikkalasi ham siyosatga mos; muhimi holat taqsimotdan chiqadi.
  for (const row of allocations) {
    const target = await getJson(admin, `/billing/invoices/${row.invoice.id}`);
    check(
      ['PARTIALLY_PAID', 'PAID'].includes(target.status),
      'yopilgan hujjat holati taqsimotdan yangilandi',
      `${target.number}: ${target.status}`,
    );
  }
});

await step('qolgan tolov qadami bajarildi', async () => {
  // Diler butun qarzini yopadi (eskilari ham): shunda yakuniy qarz = hujjatgacha bo'lgan qarz - eskilar.
  const current = await getJson(admin, `/billing/dealers/${dealerId}/balance`);
  await pay(current.outstanding);

  const after = await getJson(admin, `/billing/dealers/${dealerId}/balance`);
  check(after.outstanding === 0, 'diler qarzi NOLGA tushdi', `${after.outstanding}`);

  const final = await getJson(admin, `/billing/invoices/${invoice.id}`);
  check(final.status === 'PAID', 'bizning hujjat TOLANGAN', final.status);
  check(final.outstanding === 0, 'hujjat qarzi nol', `${final.outstanding}`);

  const mine = await getJson(dealerUi, `/dealer/balance`);
  check(mine.outstanding === 0, 'DILER ozi ham nol qarzni koradi', `${mine.outstanding}`);
});

// =====================================================================
// 3. HISOBOT MOLIYA AMALLARIDAN OZGARMAYDI VA BUYURTMANI KORSATADI
// =====================================================================
console.log('\n=== 3. Hisobot ===');
await step('hisobot qadami bajarildi', async () => {
  const salesAfter = await getJson(admin, `/reports/sales?${reportQuery}`);

  /*
    Hisob-faktura va tolov SOTUVNI OZGARTIRMAYDI: sotuv — tasdiqlangan
    buyurtmalar (CONFIRMED..DELIVERED), pul harakati emas
    (`docs/REPORTS-POLICY.md`). Agar moliya amali sotuv raqamini
    siljitsa, hisobot ikki marta sanayapti degani.
  */
  check(
    JSON.stringify(salesAfter.totals) === JSON.stringify(salesBefore.totals),
    'moliya amallari SOTUV hisobotini OZGARTIRMADI',
    JSON.stringify(salesAfter.totals),
  );

  const perf = await getJson(admin, `/reports/dealer-performance?${reportQuery}`);
  const row = (perf.rows ?? []).find((entry) => entry.dealer === invoice.dealer.companyName);
  check(row !== undefined, 'diler samaradorligi hisobotida diler bor', invoice.dealer.companyName);
  check(
    (row?.deliveredTotal ?? 0) >= order.total,
    'YETKAZILGAN summa buyurtma jamini ichiga oladi',
    `${row?.deliveredTotal} >= ${order.total}`,
  );

  const csv = await admin.page.request.get(`${API}/billing/exports/invoices.csv`);
  const text = await csv.text();
  check(text.includes(invoice.number), 'hisob-faktura CSV eksportida bor', invoice.number);
});

// =====================================================================
// 4. AUDIT: KIM, QACHON, NIMA
// =====================================================================
console.log('\n=== 4. Audit jurnali ===');
await step('audit qadami bajarildi', async () => {
  const forInvoice = await getJson(admin, `/admin/audit?entityId=${invoice.id}&limit=100`);
  const actions = (forInvoice.items ?? []).map((row) => row.action);

  check(actions.includes('invoice.created'), 'hisob-faktura YARATILISHI jurnalda');
  check(actions.includes('invoice.issued'), 'hisob-faktura BERILISHI jurnalda');
  check(
    (forInvoice.items ?? []).every((row) => row.actorEmail === ADMIN_EMAIL),
    'har bir yozuvda bajaruvchi — admin',
  );

  const forOrder = await getJson(admin, `/admin/audit?entityId=${order.id}&limit=100`);
  const orderActions = (forOrder.items ?? []).map((row) => row.action);
  check(orderActions.includes('order.created'), 'buyurtma YARATILISHI jurnalda');
  check(
    orderActions.filter((action) => action === 'order.status.changed').length >= 3,
    'buyurtma HOLAT o‘zgarishlari jurnalda',
    `${orderActions.filter((a) => a === 'order.status.changed').length} ta`,
  );

  const payments = await getJson(admin, `/admin/audit?action=payment.recorded&limit=5`);
  check((payments.items ?? []).length >= 2, 'tolovlar jurnalda', `${payments.meta?.total} ta`);

  // Sirlar: jurnaldan o'qilgan HECH BIR yozuvda parol/token izi yo'q.
  const everything = JSON.stringify(await getJson(admin, `/admin/audit?limit=100`));
  check(
    !/\$argon2|eyJ[\w-]+\.[\w-]+\.[\w-]+|"password"\s*:\s*"(?!\[REDACTED\])/.test(everything),
    'jurnalning oxirgi 100 yozuvida sir izi YOQ',
  );
});

// =====================================================================
// 5. QULAYLIK VA GORIZONTAL SKROLL
// =====================================================================
console.log('\n=== 5. Qulaylik ===');
for (const [name, ctx, url] of [
  ['hisob-fakturalar', admin, `${ADMIN_URL}/finance/invoices`],
  ['tolovlar', admin, `${ADMIN_URL}/finance/payments`],
  ['audit', admin, `${ADMIN_URL}/system/audit`],
  ['hisobotlar', admin, `${ADMIN_URL}/reports`],
  ['diler-balans', dealerUi, `${DEALER_URL}/balance`],
  ['diler-hujjatlar', dealerUi, `${DEALER_URL}/invoices`],
]) {
  await ctx.page.goto(url, { waitUntil: 'networkidle' });
  await ctx.page.waitForTimeout(1200);

  const { violations } = await new AxeBuilder({ page: ctx.page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  console.log(`   axe ${name}: ${violations.length} buzilish`);
  for (const v of violations) problems.push(`axe ${name}: ${v.id} — ${v.help}`);

  const overflow = await ctx.page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) problems.push(`${name}: ${overflow}px gorizontal skroll`);
}

check(problems.length === 0, 'konsolda, tarmoqda va qulaylikda xato YOQ', `${problems.length} ta`);
for (const item of problems.slice(0, 12)) console.log(`   ${item}`);

console.log(`\nHISOB-FAKTURA: ${invoice.number} · BUYURTMA: ${order.number}`);
console.log('Yarashtirish: `node qa/reconcile-phase4.mjs`');

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
