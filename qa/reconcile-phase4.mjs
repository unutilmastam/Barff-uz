/*
  FAZA 4 — YARASHTIRISH (ROADMAP.md S39).

  Ekran ko'rsatgan raqam yetarli emas. Bu skript BAZANING O'ZIDAN
  moliya invariantlarini tekshiradi:

    1. Hujjat jami = pozitsiyalar yig'indisi (- chegirma + soliq).
    2. Hujjat jami = BUYURTMA jami (hisob-faktura buyurtmadan olinadi).
    3. Hujjat holati TAQSIMOTDAN kelib chiqadi (`invoiceStatusFor`):
       ISSUED/PARTIALLY_PAID/PAID qo'lda qo'yilmagan.
    4. Hujjatga taqsimlangan summa uning jamidan OSHMAYDI.
    5. To'lovning taqsimlangan qismi to'lov summasidan OSHMAYDI.
    6. BALANS = berilgan hujjatlar - to'lovlar, har bir diler uchun
       va API javobi bilan BIR XIL.
    7. Berilgan/to'langan hujjatning buyurtmasi YETKAZILGAN.
    8. Har bir hujjat va to'lov uchun AUDIT yozuvi bor.
    9. Audit jadvalida sir izi (parol xeshi, JWT) YO'Q.

  Hisobot SANOQ bilan chiqadi: "hammasi joyida" degan bo'sh javob
  tekshiruv umuman ishlamaganini ham bildirishi mumkin.
*/
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const require = createRequire(import.meta.url);
const { PrismaClient } = require(resolve(root, 'packages/db/generated/index.js'));

if (process.env.DATABASE_URL === undefined) {
  const env = readFileSync(resolve(root, '.env'), 'utf8');
  const line = env.split('\n').find((row) => row.startsWith('DATABASE_URL='));
  if (line !== undefined) {
    process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
}

console.log(`Baza: ${(process.env.DATABASE_URL ?? '').replace(/\/\/[^@]*@/, '//***@')}`);

const prisma = new PrismaClient();

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

/** `packages/types/src/billing.ts` dagi `invoiceStatusFor` bilan BIR XIL. */
function statusFor(total, allocated) {
  if (allocated <= 0) return 'ISSUED';
  if (allocated >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

const invoices = await prisma.invoice.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    number: true,
    dealerId: true,
    status: true,
    subtotal: true,
    discount: true,
    taxAmount: true,
    total: true,
    order: { select: { number: true, total: true, status: true } },
    items: { select: { total: true } },
    allocations: { select: { amount: true } },
  },
});

const payments = await prisma.payment.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    number: true,
    dealerId: true,
    amount: true,
    allocations: { select: { amount: true } },
  },
});

console.log(`\nTekshiriladi: ${invoices.length} ta hujjat, ${payments.length} ta tolov`);

// =====================================================================
console.log('\n=== 1-2. Hujjat jami ===');
{
  let bad = 0;
  let badOrder = 0;

  for (const inv of invoices) {
    const lines = inv.items.reduce((sum, row) => sum + row.total, 0);
    if (lines !== inv.subtotal || inv.subtotal - inv.discount + inv.taxAmount !== inv.total) {
      bad += 1;
      console.log(
        `   ${inv.number}: pozitsiyalar ${lines}, oraliq ${inv.subtotal}, jami ${inv.total}`,
      );
    }
    if (inv.order.total !== inv.total) {
      badOrder += 1;
      console.log(
        `   ${inv.number}: buyurtma ${inv.order.number} jami ${inv.order.total} != ${inv.total}`,
      );
    }
  }

  check(
    bad === 0,
    'hujjat jami pozitsiyalar yigindisiga teng',
    `${invoices.length - bad}/${invoices.length}`,
  );
  check(
    badOrder === 0,
    'hujjat jami BUYURTMA jamiga teng',
    `${invoices.length - badOrder}/${invoices.length}`,
  );
}

// =====================================================================
console.log('\n=== 3-4. Holat taqsimotdan kelib chiqadi ===');
{
  let badStatus = 0;
  let over = 0;
  let checked = 0;

  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') {
      if (inv.allocations.length > 0) {
        badStatus += 1;
        console.log(`   ${inv.number}: ${inv.status}, lekin taqsimoti bor`);
      }
      continue;
    }

    checked += 1;
    const allocated = inv.allocations.reduce((sum, row) => sum + row.amount, 0);
    if (statusFor(inv.total, allocated) !== inv.status) {
      badStatus += 1;
      console.log(`   ${inv.number}: holat ${inv.status}, taqsimot ${allocated}/${inv.total}`);
    }
    if (allocated > inv.total) {
      over += 1;
      console.log(`   ${inv.number}: taqsimot ${allocated} > jami ${inv.total}`);
    }
  }

  check(checked > 0, 'berilgan hujjatlar bor (tekshiruv bosh emas)', `${checked} ta`);
  check(badStatus === 0, 'hujjat holati taqsimotga MOS', `${checked - badStatus}/${checked}`);
  check(over === 0, 'hech bir hujjatga jamidan KOP taqsimlanmagan');
}

// =====================================================================
console.log('\n=== 5. Tolov taqsimoti ===');
{
  let over = 0;
  for (const pay of payments) {
    const allocated = pay.allocations.reduce((sum, row) => sum + row.amount, 0);
    if (allocated > pay.amount) {
      over += 1;
      console.log(`   ${pay.number}: taqsimot ${allocated} > tolov ${pay.amount}`);
    }
  }
  check(payments.length > 0, 'tolovlar bor (tekshiruv bosh emas)', `${payments.length} ta`);
  check(over === 0, 'tolovning taqsimoti tolov summasidan OSHMAYDI');
}

// =====================================================================
console.log('\n=== 6. Balans ===');
{
  const dealerIds = new Set([
    ...invoices.map((i) => i.dealerId),
    ...payments.map((p) => p.dealerId),
  ]);
  let bad = 0;

  for (const dealerId of dealerIds) {
    const invoiced = invoices
      .filter(
        (i) => i.dealerId === dealerId && ['ISSUED', 'PARTIALLY_PAID', 'PAID'].includes(i.status),
      )
      .reduce((sum, i) => sum + i.total, 0);
    const paid = payments
      .filter((p) => p.dealerId === dealerId)
      .reduce((sum, p) => sum + p.amount, 0);

    // Qarz — formuladan; saqlanmaydi. API bilan solishtirish `e2e-phase4.mjs` da.
    const expectedOutstanding = invoiced - paid;
    const fromApi = await prisma.$queryRaw`
      SELECT
        COALESCE((SELECT SUM(total) FROM invoices
                   WHERE "dealerId" = ${dealerId}::uuid AND "deletedAt" IS NULL
                     AND status IN ('ISSUED','PARTIALLY_PAID','PAID')), 0)::int AS invoiced,
        COALESCE((SELECT SUM(amount) FROM payments
                   WHERE "dealerId" = ${dealerId}::uuid AND "deletedAt" IS NULL), 0)::int AS paid`;

    const sql = fromApi[0];
    if (sql.invoiced - sql.paid !== expectedOutstanding) {
      bad += 1;
      console.log(`   ${dealerId}: JS ${expectedOutstanding}, SQL ${sql.invoiced - sql.paid}`);
    }
  }

  check(dealerIds.size > 0, 'dilerlar bor (tekshiruv bosh emas)', `${dealerIds.size} ta`);
  check(
    bad === 0,
    'balans ikki usulda (JS va SQL) bir xil chiqdi',
    `${dealerIds.size - bad}/${dealerIds.size}`,
  );
}

// =====================================================================
console.log('\n=== 7. Hujjat — yetkazilgan buyurtmadan ===');
{
  const issued = invoices.filter((i) => ['ISSUED', 'PARTIALLY_PAID', 'PAID'].includes(i.status));
  const bad = issued.filter((i) => i.order.status !== 'DELIVERED');

  for (const inv of bad)
    console.log(`   ${inv.number}: buyurtma ${inv.order.number} holati ${inv.order.status}`);
  check(
    bad.length === 0,
    'berilgan hujjatlarning HAMMA buyurtmasi YETKAZILGAN',
    `${issued.length - bad.length}/${issued.length}`,
  );
}

// =====================================================================
console.log('\n=== 8. Audit qamrovi ===');
{
  const logs = await prisma.auditLog.findMany({
    where: { action: { in: ['invoice.created', 'payment.recorded'] } },
    select: { action: true, entityId: true },
  });
  const created = new Set(
    logs.filter((l) => l.action === 'invoice.created').map((l) => l.entityId),
  );
  const recorded = new Set(
    logs.filter((l) => l.action === 'payment.recorded').map((l) => l.entityId),
  );

  const missingInvoices = invoices.filter((i) => !created.has(i.id));
  const missingPayments = payments.filter((p) => !recorded.has(p.id));

  check(
    missingInvoices.length === 0,
    'HAR BIR hujjat yaratilishi auditda',
    `${invoices.length - missingInvoices.length}/${invoices.length}`,
  );
  check(
    missingPayments.length === 0,
    'HAR BIR tolov auditda',
    `${payments.length - missingPayments.length}/${payments.length}`,
  );
}

// =====================================================================
console.log('\n=== 9. Auditda sir izi yoqligi ===');
{
  const rows = await prisma.auditLog.findMany({
    select: { action: true, before: true, after: true },
  });
  const dump = (row) => JSON.stringify([row.before, row.after]);
  const leaks = rows.filter((row) => /\$argon2|eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(dump(row)));

  check(rows.length > 0, 'audit yozuvlari bor (tekshiruv bosh emas)', `${rows.length} ta`);
  check(
    leaks.length === 0,
    'HECH BIR yozuvda parol xeshi yoki token yoq',
    `${rows.length} ta yozuv skanerlandi`,
  );
}

await prisma.$disconnect();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
