/*
  FAZA 3 — YARASHTIRISH (ROADMAP.md S35).

  Darvoza sharti: "fizik bajarish tizimda TO'LIQ kuzatiladi".
  Ekran ko'rsatgan raqam yetarli emas — u keshdan kelgan bo'lishi
  mumkin. Shuning uchun bu skript BAZANING O'ZIDAN o'qiydi va
  invariantlarni tekshiradi:

    1. Qoldiq — harakat jurnalining YIG'INDISI. Har bir
       (ombor, variant) juftligi uchun `warehouse_stock.quantity`
       jurnal bo'yicha hisoblangan qiymatga TENG bo'lishi kerak.
       Bu S30 dagi tetiklarning asosiy va'dasi; u buzilsa,
       qoldiqqa umuman ishonib bo'lmaydi.

    2. BAND — ochiq zaxiralarning yig'indisi.

    3. Qadoqlangan (yoki undan keyingi) har bir buyurtma uchun
       jurnalda `OUT` harakati bo'lishi va uning miqdori buyurtma
       pozitsiyalariga MOS kelishi kerak.

    4. `READY_FOR_DELIVERY` va undan keyingi har bir buyurtmada
       yetkazma bo'lishi kerak — yetkazmasiz buyurtma hech kim
       ko'rmaydigan buyurtma.

    5. Yetkazma `DELIVERED` bo'lsa, buyurtma ham `DELIVERED`
       bo'lishi kerak (`docs/DELIVERY-POLICY.md` §1: yetkazma
       buyurtmani YETAKLAYDI).

  Hisobot SANOQ bilan chiqadi: nechta juftlik tekshirildi va
  nechtasi mos kelmadi. "Hammasi joyida" degan bo'sh javob
  tekshiruv UMUMAN ishlamaganini ham bildirishi mumkin.
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

/**
 * Harakat turining qoldiq va bandga ta'siri.
 *
 * DIQQAT: bu `packages/types/src/stock.ts` dagi `movementDelta` va
 * `barff_apply_stock_movement()` tetigi bilan BIR XIL bo'lishi
 * kerak. Uchtasi ajralib ketsa, yarashtirish YOLG'ON xato berardi.
 * Shuning uchun quyida ularning har biriga havola bor.
 */
function delta(type, quantity) {
  switch (type) {
    case 'IN':
    case 'RETURN':
      return { quantity: Math.abs(quantity), reserved: 0 };
    case 'OUT':
      return { quantity: -Math.abs(quantity), reserved: 0 };
    case 'ADJUSTMENT':
    case 'TRANSFER':
      return { quantity, reserved: 0 };
    case 'RESERVED':
      return { quantity: 0, reserved: Math.abs(quantity) };
    case 'RELEASED':
      return { quantity: 0, reserved: -Math.abs(quantity) };
    default:
      throw new Error(`Noma'lum harakat turi: ${type}`);
  }
}

// =====================================================================
// 1-2. QOLDIQ — JURNALNING YIG'INDISI
// =====================================================================
console.log('\n=== 1. Qoldiq harakat jurnaliga mos keladimi ===');

const movements = await prisma.stockMovement.findMany({
  select: { warehouseId: true, productVariantId: true, type: true, quantity: true },
});

const ledger = new Map();
for (const row of movements) {
  const key = `${row.warehouseId}:${row.productVariantId}`;
  const current = ledger.get(key) ?? { quantity: 0, reserved: 0 };
  const d = delta(row.type, row.quantity);
  ledger.set(key, {
    quantity: current.quantity + d.quantity,
    reserved: current.reserved + d.reserved,
  });
}

const stock = await prisma.warehouseStock.findMany({
  select: {
    warehouseId: true,
    productVariantId: true,
    quantity: true,
    reservedQuantity: true,
    warehouse: { select: { code: true } },
    productVariant: { select: { sku: true } },
  },
});

let mismatched = 0;
for (const row of stock) {
  const key = `${row.warehouseId}:${row.productVariantId}`;
  const expected = ledger.get(key) ?? { quantity: 0, reserved: 0 };

  if (row.quantity !== expected.quantity) {
    mismatched += 1;
    console.log(
      `     ${row.warehouse.code}/${row.productVariant.sku}: qoldiq ${row.quantity}, jurnal ${expected.quantity}`,
    );
  }
}

check(
  mismatched === 0,
  'qoldiq jurnal yigindisiga TENG',
  `${stock.length} ta juftlik tekshirildi, ${mismatched} tasi mos kelmadi`,
);

/*
  JURNALDA BOR, LEKIN QOLDIQDA YO'Q JUFTLIK — ALOHIDA XATO.

  Yuqoridagi aylanma faqat MAVJUD qoldiq qatorlaridan yuradi.
  Qator o'chirilgan bo'lsa (tetik buni taqiqlaydi, lekin
  migratsiya yoki qo'l bilan bo'lishi mumkin), tekshiruv uni
  UMUMAN ko'rmasdi va yashil qolardi.
*/
const stockKeys = new Set(stock.map((row) => `${row.warehouseId}:${row.productVariantId}`));
const orphanLedger = [...ledger.entries()].filter(
  ([key, value]) => !stockKeys.has(key) && (value.quantity !== 0 || value.reserved !== 0),
);

check(
  orphanLedger.length === 0,
  'jurnaldagi har bir juftlikning QOLDIQ qatori bor',
  `${orphanLedger.length} ta yetishmaydi`,
);

console.log('\n=== 2. BAND ochiq zaxiralarga mos keladimi ===');

const active = await prisma.stockReservation.groupBy({
  by: ['warehouseId', 'productVariantId'],
  where: { status: 'ACTIVE' },
  _sum: { quantity: true },
});

const reserved = new Map(
  active.map((row) => [`${row.warehouseId}:${row.productVariantId}`, row._sum.quantity ?? 0]),
);

let reservedMismatch = 0;
for (const row of stock) {
  const key = `${row.warehouseId}:${row.productVariantId}`;
  const expected = reserved.get(key) ?? 0;

  if (row.reservedQuantity !== expected) {
    reservedMismatch += 1;
    console.log(
      `     ${row.warehouse.code}/${row.productVariant.sku}: band ${row.reservedQuantity}, ochiq zaxira ${expected}`,
    );
  }
}

check(
  reservedMismatch === 0,
  'BAND ochiq zaxiralar yigindisiga TENG',
  `${stock.length} ta juftlik, ${reservedMismatch} tasi mos kelmadi`,
);

// =====================================================================
// 3. QADOQLANGAN BUYURTMA — JURNALDA CHIQIM
// =====================================================================
console.log('\n=== 3. Qadoqlangan buyurtma jurnalda CHIQIM qoldirdimi ===');

/** `PACKED` dan keyingi holatlar — tovar ombordan CHIQQAN bo'lishi kerak. */
const SHIPPED_STATUSES = [
  'PACKED',
  'READY_FOR_DELIVERY',
  'DRIVER_ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
];

const shipped = await prisma.order.findMany({
  where: { status: { in: SHIPPED_STATUSES }, deletedAt: null },
  select: {
    id: true,
    number: true,
    items: { select: { variantId: true, quantity: true } },
  },
});

const outMovements = await prisma.stockMovement.findMany({
  where: { type: 'OUT' },
  select: { productVariantId: true, quantity: true, reference: true },
});

let missingOut = 0;
for (const order of shipped) {
  const mine = outMovements.filter((row) => row.reference === order.number);

  if (mine.length === 0) {
    missingOut += 1;
    console.log(`     ${order.number}: jurnalda CHIQIM yo‘q`);
    continue;
  }

  for (const item of order.items) {
    const total = mine
      .filter((row) => row.productVariantId === item.variantId)
      .reduce((sum, row) => sum + Math.abs(row.quantity), 0);

    if (total !== item.quantity) {
      missingOut += 1;
      console.log(`     ${order.number}: pozitsiya ${item.quantity} dona, chiqim ${total} dona`);
    }
  }
}

check(
  missingOut === 0,
  'har bir qadoqlangan buyurtmaning CHIQIMI bor va miqdori MOS',
  `${shipped.length} ta buyurtma, ${missingOut} ta nomuvofiqlik`,
);

// =====================================================================
// 4. YETKAZISHGA TAYYOR BUYURTMADA YETKAZMA BOR
// =====================================================================
console.log('\n=== 4. Yetkazishga tayyor buyurtmada YETKAZMA bor ===');

const DELIVERABLE = ['READY_FOR_DELIVERY', 'DRIVER_ASSIGNED', 'IN_TRANSIT', 'DELIVERED'];

const needDelivery = await prisma.order.findMany({
  where: { status: { in: DELIVERABLE }, deletedAt: null },
  select: { number: true, delivery: { select: { id: true, number: true, status: true } } },
});

const withoutDelivery = needDelivery.filter((row) => row.delivery === null);
for (const row of withoutDelivery) console.log(`     ${row.number}: yetkazma yo‘q`);

check(
  withoutDelivery.length === 0,
  'yetkazishga tayyor har bir buyurtmada yetkazma bor',
  `${needDelivery.length} ta buyurtma, ${withoutDelivery.length} tasida yo‘q`,
);

// =====================================================================
// 5. TOPSHIRILGAN YETKAZMA BUYURTMANI HAM TOPSHIRILGAN QILADI
// =====================================================================
console.log('\n=== 5. Topshirilgan yetkazma — topshirilgan buyurtma ===');

const delivered = await prisma.delivery.findMany({
  where: { status: 'DELIVERED', deletedAt: null },
  select: { number: true, order: { select: { number: true, status: true } } },
});

const outOfSync = delivered.filter((row) => row.order?.status !== 'DELIVERED');
for (const row of outOfSync) {
  console.log(`     ${row.number}: buyurtma ${row.order?.number} = ${row.order?.status}`);
}

check(
  outOfSync.length === 0,
  'topshirilgan yetkazmaning buyurtmasi ham TOPSHIRILGAN',
  `${delivered.length} ta yetkazma, ${outOfSync.length} tasi mos kelmadi`,
);

// =====================================================================
// SANOQ — "hammasi joyida" BO'SH BAZANI ham bildirishi mumkin
// =====================================================================
console.log('\n=== Hajm ===');
console.log(`   harakat: ${movements.length}`);
console.log(`   qoldiq qatori: ${stock.length}`);
console.log(`   jo‘natilgan buyurtma: ${shipped.length}`);
console.log(`   yetkazma (topshirilgan): ${delivered.length}`);

/*
  BO'SH BAZA DARVOZANI YOPMAYDI.

  Hamma tekshiruv "0 ta nomuvofiqlik" berardi, chunki tekshirish
  uchun hech narsa yo'q edi. Darvoza esa zanjir ISHLAGANINI
  talab qiladi.
*/
if (movements.length === 0 || shipped.length === 0) {
  console.log('\nDIQQAT: tekshirish uchun ma‘lumot yo‘q — avval `npm run e2e:p3`.');
  failures += 1;
}

await prisma.$disconnect();
console.log(`\nNATIJA: ${failures === 0 ? 'YARASHTIRISH TOZA' : failures + ' ta nomuvofiqlik'}`);
process.exit(failures === 0 ? 0 : 1);
