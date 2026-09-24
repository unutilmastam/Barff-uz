/*
  FAZA 2 SINOV YOZUVLARINI TOZALASH.

  `e2e-phase2.mjs` har yurganda BITTA diler arizasi, bitta akkaunt,
  bitta manzil va bitta buyurtma qoldiradi. Ularni skriptning O'ZI
  o'chira olmaydi: diler va buyurtmani o'chirish endpointi ATAYLAB
  yo'q — ikkalasi ham biznes yozuvi va faqat holat o'zgarishi bilan
  yuritiladi (S22, S26).

  Shuning uchun tozalash ALOHIDA va ATAYLAB QO'LDA ishga tushiriladi.
  U FAQAT `Faza2 Sinov ` bilan boshlanadigan kompaniyalarni o'chiradi,
  ya'ni haqiqiy dilerga tegmaydi.

  DIQQAT: bu skript ishlab chiqarish bazasida YURGIZILMAYDI
  (`CLAUDE.md` §12: "use production DB for development" taqiqlangan).
  U `.env` dagi `DATABASE_URL` ni o'qiydi — qaysi bazaga ulanayotgani
  chop etiladi va tasdiq so'raladi.
*/
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/* `qa/` ataylab pnpm workspace'dan tashqarida (README), shuning uchun
   Prisma klienti YO'L bo'yicha olinadi, `@barff/db` nomi bilan emas. */
const require = createRequire(import.meta.url);
const { PrismaClient } = require(resolve(root, 'packages/db/generated/index.js'));

/** `.env` — API bilan BIR XIL bazaga ulanish uchun. */
if (process.env.DATABASE_URL === undefined) {
  const env = readFileSync(resolve(root, '.env'), 'utf8');
  const line = env.split('\n').find((row) => row.startsWith('DATABASE_URL='));
  if (line !== undefined) {
    process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
}

const url = process.env.DATABASE_URL ?? '';
// Parol chop etilmaydi (CLAUDE.md §12, §23).
console.log(`Baza: ${url.replace(/\/\/[^@]*@/, '//***@')}`);

/* `e2e-phase2.mjs` va `load-phase2.mjs` qoldiradigan prefikslar. */
const PREFIXES = ['Faza2 Sinov ', 'Yuk Sinov '];
const prisma = new PrismaClient();

const dealers = await prisma.dealer.findMany({
  where: { OR: PREFIXES.map((prefix) => ({ companyName: { startsWith: prefix } })) },
  select: { id: true, companyName: true, userId: true },
});

if (dealers.length === 0) {
  console.log('Tozalanadigan sinov dileri yo‘q.');
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`${dealers.length} ta sinov dileri topildi:`);
for (const dealer of dealers) console.log(`  ${dealer.companyName}`);

if (process.argv.includes('--yes') === false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('O‘chirilsinmi? (ha/yo‘q) ');
  rl.close();

  if (answer.trim().toLowerCase() !== 'ha') {
    console.log('Bekor qilindi.');
    await prisma.$disconnect();
    process.exit(0);
  }
}

const dealerIds = dealers.map((dealer) => dealer.id);
const userIds = dealers.map((dealer) => dealer.userId);

/*
  TARTIB MUHIM: tashqi kalitlar avval bo'shatiladi.

  Prisma `onDelete: Cascade` ni hamma joyda ishlatmaydi, ya'ni
  buyurtmani o'chirmasdan dilerni o'chirib bo'lmaydi.
*/
const orders = await prisma.order.findMany({
  where: { dealerId: { in: dealerIds } },
  select: { id: true },
});
const orderIds = orders.map((order) => order.id);

await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

await prisma.cartItem.deleteMany({ where: { cart: { dealerId: { in: dealerIds } } } });
await prisma.cart.deleteMany({ where: { dealerId: { in: dealerIds } } });

await prisma.dealerAddress.deleteMany({ where: { dealerId: { in: dealerIds } } });
await prisma.dealerEvent.deleteMany({ where: { dealerId: { in: dealerIds } } });
await prisma.dealer.deleteMany({ where: { id: { in: dealerIds } } });

await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } });
await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
await prisma.user.deleteMany({ where: { id: { in: userIds } } });

console.log(
  `Tozalandi: ${dealerIds.length} diler, ${orderIds.length} buyurtma, ${userIds.length} akkaunt.`,
);
console.log('AUDIT JURNALI SAQLANDI — u ataylab o‘chirilmaydi (CLAUDE.md §23).');

await prisma.$disconnect();
