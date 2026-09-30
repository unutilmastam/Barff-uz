/*
  FAZA 3 UCHUN XODIM AKKAUNTLARI.

  NEGA BU SKRIPT BOR.

  `e2e-phase3.mjs` ombor, logistika va HAYDOVCHI sifatida ishlaydi,
  lekin bu akkauntlarni YARATADIGAN yo'l yo'q: `/system/users`
  hali qurilmagan (`navigation.ts`, `ready: false`) va foydalanuvchi
  yaratish API'si ham yo'q — bu ATAYLAB, chunki xodim akkaunti
  yaratish o'zi alohida qadam (S38 atrofida).

  Shuning uchun akkauntlar bu yerda, bazada yaratiladi. Bu QA
  ASBOBI, ilovaning bir qismi emas — xuddi `cleanup-phase2.mjs`
  kabi. Zanjirning O'ZI (buyurtma -> zaxira -> yig'ish -> qadoqlash
  -> biriktirish -> yetkazish) esa FAQAT brauzerda yuriladi:
  darvoza taqiqlaydigan narsa aynan "qo'lda aralashuv".

  HAYDOVCHI PROFILI bu yerda yaratilmaydi — u admin panelida,
  «Park» bo'limida ochiladi va bu zanjirning bir qismi (S34).

  DIQQAT: ishlab chiqarish bazasida YURGIZILMAYDI (`CLAUDE.md` §12).
  Parollar muhit o'zgaruvchilaridan olinadi; kodda standart parol
  yo'q — u repozitoriyga tushib, hamma muhitga ko'chib o'tardi.
*/
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const require = createRequire(import.meta.url);
const { PrismaClient } = require(resolve(root, 'packages/db/generated/index.js'));
const argon2 = require(resolve(root, 'node_modules/argon2'));

if (process.env.DATABASE_URL === undefined) {
  const env = readFileSync(resolve(root, '.env'), 'utf8');
  const line = env.split('\n').find((row) => row.startsWith('DATABASE_URL='));
  if (line !== undefined) {
    process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
}

const url = process.env.DATABASE_URL ?? '';
console.log(`Baza: ${url.replace(/\/\/[^@]*@/, '//***@')}`);

/*
  PAROL MUHITDAN. Standart qiymat YO'Q.

  Kodga yozilgan parol repozitoriyga tushadi va u yerdan hamma
  muhitga ko'chib o'tadi (`CLAUDE.md` §12: "never commit secrets").
*/
const password = process.env.STAFF_PASSWORD;

if (password === undefined || password.length < 12) {
  console.error(
    'XATO: `STAFF_PASSWORD` berilmagan yoki qisqa (kamida 12 belgi).\n' +
      'Misol: STAFF_PASSWORD="Faza3-Lokal-Parol-2026" node qa/seed-staff.mjs',
  );
  process.exit(2);
}

/** Sinov akkauntlari — `qa3-` prefiksi bilan, haqiqiysidan ajralib turadi. */
const STAFF = [
  { role: 'WAREHOUSE', email: 'qa3-ombor@barff.uz', fullName: 'QA Ombor xodimi' },
  { role: 'LOGISTICS', email: 'qa3-logist@barff.uz', fullName: 'QA Logist' },
  { role: 'DRIVER', email: 'qa3-haydovchi@barff.uz', fullName: 'QA Haydovchi' },
];

const prisma = new PrismaClient();
const hash = await argon2.hash(password, { type: argon2.argon2id });

for (const entry of STAFF) {
  const role = await prisma.role.findUnique({ where: { code: entry.role } });

  if (role === null) {
    console.error(`XATO: "${entry.role}" roli topilmadi — avval \`pnpm db:seed\`.`);
    process.exitCode = 1;
    continue;
  }

  /*
    PAROL HAR YURISHDA YANGILANADI.

    Akkaunt oldingi yurishdan qolgan bo'lsa va parol boshqacha
    bo'lsa, sinov "kirish ishlamadi" deb yiqilardi va sabab
    ilovada emas, eski yozuvda bo'lardi.
  */
  const user = await prisma.user.upsert({
    where: { email: entry.email },
    create: {
      email: entry.email,
      fullName: entry.fullName,
      passwordHash: hash,
      isActive: true,
    },
    update: { passwordHash: hash, isActive: true, deletedAt: null },
    select: { id: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  console.log(`  ${entry.role}: ${entry.email}`);
}

/*
  QA DILERI — TASDIQLANGAN, MANZILI BOR.

  Faza 3 darvozasi FIZIK BAJARISHNI tekshiradi: zanjir "diler
  buyurtma berdi" dan BOSHLANADI. Ariza berish va uni tasdiqlash —
  Faza 2 ning darvozasi (S29) va u allaqachon yopilgan.

  Uni bu yerda takrorlash ikki narsani buzardi:

  1. `POST /dealers/register` soatiga 5 ta. Darvozani ketma-ket
     ikki marta yurgizib bo'lmasdi.
  2. `User.phone` yagona. Har yurish yangi raqam talab qilardi va
     baza sinov dilerlariga to'lib borardi.

  Shuning uchun diler BIR MARTA yaratiladi va qayta ishlatiladi.
*/
const DEALER_EMAIL = 'qa3-diler@barff.uz';

const dealerUser = await prisma.user.upsert({
  where: { email: DEALER_EMAIL },
  create: {
    email: DEALER_EMAIL,
    fullName: 'QA Diler',
    phone: '998900000003',
    passwordHash: hash,
    isActive: true,
  },
  update: { passwordHash: hash, isActive: true, deletedAt: null },
  select: { id: true },
});

const dealerRole = await prisma.role.findUnique({ where: { code: 'DEALER' } });

if (dealerRole !== null) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: dealerUser.id, roleId: dealerRole.id } },
    create: { userId: dealerUser.id, roleId: dealerRole.id },
    update: {},
  });
}

const dealer = await prisma.dealer.upsert({
  where: { userId: dealerUser.id },
  create: {
    userId: dealerUser.id,
    companyName: 'QA Faza3 MChJ',
    taxId: '300000003',
    region: 'Toshkent',
    businessType: 'RETAIL',
    status: 'APPROVED',
  },
  update: { status: 'APPROVED' },
  select: { id: true },
});

const address = await prisma.dealerAddress.findFirst({
  where: { dealerId: dealer.id, deletedAt: null },
  select: { id: true },
});

if (address === null) {
  await prisma.dealerAddress.create({
    data: {
      dealerId: dealer.id,
      label: 'QA ombori',
      region: 'Toshkent',
      street: 'Sinov ko‘chasi 3',
      contactName: 'QA Qabul',
      contactPhone: '998900000003',
      isDefault: true,
    },
  });
}

console.log(`  DEALER:    ${DEALER_EMAIL} (QA Faza3 MChJ, TASDIQLANGAN)`);

await prisma.$disconnect();
console.log('\nHaydovchi PROFILI bu yerda ochilmaydi — u admin panelida, «Park» bo‘limida.');
