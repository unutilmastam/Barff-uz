/**
 * Boshlang'ich ma'lumotlar (CLAUDE.md §10, ROADMAP S03).
 *
 * Idempotent: qayta-qayta ishga tushirilsa ham natija bir xil bo'ladi.
 * Shuning uchun `upsert` ishlatiladi va mavjud yozuvlar qayta yaratilmaydi.
 *
 * Bu skript HECH QACHON production bazasiga o'zi ma'lumot to'qib qo'ymaydi:
 * admin foydalanuvchisi faqat muhit o'zgaruvchilaridan olinadi.
 */
import { randomBytes } from 'node:crypto';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES, type Role } from '@barff/types';
import argon2 from 'argon2';
import { PrismaClient } from '@barff/db';

const prisma = new PrismaClient();

/** `orders.status.change` -> `orders` */
function permissionGroup(code: string): string {
  return code.split('.')[0] ?? 'other';
}

const ROLE_NAMES: Record<Role, string> = {
  VISITOR: 'Mehmon',
  DEALER: 'Diler',
  SALES: 'Sotuv',
  WAREHOUSE: 'Ombor',
  LOGISTICS: 'Logistika',
  DRIVER: 'Haydovchi',
  ADMIN: 'Administrator',
};

/**
 * VISITOR bazaga YOZILMAYDI: u autentifikatsiyasiz mehmon holati, biriktirib
 * bo'ladigan rol emas. Uni jadvalga qo'shish "hech kimga tegishli bo'lmagan
 * rol" degan chalkashlikni tug'dirardi.
 */
const SEEDED_ROLES = ROLES.filter((role) => role !== 'VISITOR');

async function seedPermissions(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const code of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { group: permissionGroup(code) },
      create: { code, group: permissionGroup(code) },
    });
    ids.set(code, permission.id);
  }

  console.log(`  ruxsatlar: ${ids.size}`);
  return ids;
}

async function seedRoles(permissionIds: Map<string, string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const code of SEEDED_ROLES) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_NAMES[code] },
      create: { code, name: ROLE_NAMES[code], isSystem: true },
    });
    ids.set(code, role.id);

    const wanted = DEFAULT_ROLE_PERMISSIONS[code];
    for (const permissionCode of wanted) {
      const permissionId = permissionIds.get(permissionCode);
      if (permissionId === undefined) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }

    console.log(`  rol ${code}: ${wanted.length} ta ruxsat`);
  }

  return ids;
}

/**
 * Admin foydalanuvchisi.
 *
 * Email va parol MUHIT O'ZGARUVCHILARIDAN olinadi. Kodda standart parol
 * bo'lishi mumkin emas — aks holda u production'ga ham ko'chib o'tadi va
 * hammaga ma'lum bo'lib qoladi (CLAUDE.md §12).
 */
async function seedAdmin(roleIds: Map<string, string>): Promise<void> {
  const email = process.env['SEED_ADMIN_EMAIL'];
  const fullName = process.env['SEED_ADMIN_NAME'] ?? 'BARFF Administrator';
  let password = process.env['SEED_ADMIN_PASSWORD'];

  if (email === undefined || email.length === 0) {
    console.log("  admin: SEED_ADMIN_EMAIL berilmagan — o'tkazib yuborildi");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing !== null) {
    console.log(`  admin: ${email} allaqachon mavjud — parol o'zgartirilmadi`);
    await ensureAdminRole(existing.id, roleIds);
    return;
  }

  if (password === undefined || password.length === 0) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        "SEED_ADMIN_PASSWORD berilmagan. Production'da tasodifiy parol " +
          'yaratilmaydi — u loglarda qolib ketardi.',
      );
    }
    // Faqat lokal/staging uchun: bir martalik tasodifiy parol.
    password = randomBytes(18).toString('base64url');
    console.log(`  admin: vaqtinchalik parol yaratildi -> ${password}`);
    console.log('  DIQQAT: birinchi kirishdan keyin darhol almashtiring.');
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      isActive: true,
    },
  });

  await ensureAdminRole(user.id, roleIds);
  console.log(`  admin: ${email} yaratildi`);
}

async function ensureAdminRole(userId: string, roleIds: Map<string, string>): Promise<void> {
  const adminRoleId = roleIds.get('ADMIN');
  if (adminRoleId === undefined) return;

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: adminRoleId } },
    update: {},
    create: { userId, roleId: adminRoleId },
  });
}

/**
 * Boshlang'ich sozlamalar.
 *
 * MOCK qiymatlar BARFF tasdiqlagunicha turadi — hech qanday kompaniya fakti
 * o'ylab topilmaydi (CLAUDE.md §1).
 */
async function seedSettings(): Promise<void> {
  const settings = [
    {
      key: 'site.contact',
      value: {
        phone: 'REPLACE_WITH_REAL_DATA',
        email: 'REPLACE_WITH_REAL_DATA',
        address: {
          uz: 'REPLACE_WITH_REAL_DATA',
          ru: 'REPLACE_WITH_REAL_DATA',
          en: 'REPLACE_WITH_REAL_DATA',
        },
      },
      description: "Ommaviy kontakt ma'lumotlari (MOCK — Q3)",
      isPublic: true,
    },
    {
      key: 'orders.minimumQuantity',
      value: { default: 1 },
      description: 'Minimal buyurtma miqdori (MOCK — Q9)',
      isPublic: false,
    },
    {
      key: 'notifications.lead',
      value: {
        telegramChatId: 'REPLACE_WITH_REAL_DATA',
        email: 'REPLACE_WITH_REAL_DATA',
      },
      description: 'Yangi B2B ariza kimga xabar qilinadi (MOCK — Q12)',
      // Bildirishnoma manzillari OMMAVIY EMAS: ular ichki kontaktlar.
      isPublic: false,
    },
    {
      key: 'site.defaultLocale',
      value: { locale: 'uz' },
      description: 'Standart til',
      isPublic: true,
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { description: setting.description, isPublic: setting.isPublic },
      create: setting,
    });
  }

  console.log(`  sozlamalar: ${settings.length}`);
}

/**
 * Namuna mahsulotlar.
 *
 * DIQQAT: bularning HAMMASI o'ylab topilgan (CLAUDE.md §1). Haqiqiy
 * nomlar, hajmlar, tarkib va narxlar BARFF dan kelishi kerak — shu
 * sababli har bir nom `[MOCK]` bilan boshlanadi va uni saytda ko'rgan
 * odam darhol bu vaqtinchalik ma'lumot ekanini tushunadi.
 *
 * Narxlar TIYINDA (butun son): 12 000 so'm -> 1 200 000.
 */
const MOCK_CATEGORY = {
  slug: 'mock-sharbatlar',
  name: { uz: '[MOCK] Sharbatlar', ru: '[MOCK] Соки', en: '[MOCK] Juices' },
  description: {
    uz: 'REPLACE_WITH_REAL_DATA — kategoriya tavsifi',
    ru: 'REPLACE_WITH_REAL_DATA — описание категории',
    en: 'REPLACE_WITH_REAL_DATA — category description',
  },
};

const MOCK_PRODUCTS = [
  {
    slug: 'mock-anor-sharbati',
    sku: 'MOCK-ANOR',
    name: {
      uz: '[MOCK] Anor sharbati',
      ru: '[MOCK] Гранатовый сок',
      en: '[MOCK] Pomegranate juice',
    },
    flavor: { uz: 'Anor', ru: 'Гранат', en: 'Pomegranate' },
    variants: [
      { sku: 'MOCK-ANOR-500', volumeMl: 500, amount: 1_200_000 },
      { sku: 'MOCK-ANOR-1000', volumeMl: 1000, amount: 2_100_000 },
    ],
  },
  {
    slug: 'mock-olma-sharbati',
    sku: 'MOCK-OLMA',
    name: { uz: '[MOCK] Olma sharbati', ru: '[MOCK] Яблочный сок', en: '[MOCK] Apple juice' },
    flavor: { uz: 'Olma', ru: 'Яблоко', en: 'Apple' },
    variants: [{ sku: 'MOCK-OLMA-1000', volumeMl: 1000, amount: 1_800_000 }],
  },
];

async function seedMockProducts(): Promise<void> {
  const category = await prisma.productCategory.upsert({
    where: { slug: MOCK_CATEGORY.slug },
    update: { name: MOCK_CATEGORY.name, description: MOCK_CATEGORY.description },
    create: MOCK_CATEGORY,
  });

  for (const item of MOCK_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { name: item.name, flavor: item.flavor },
      create: {
        slug: item.slug,
        sku: item.sku,
        categoryId: category.id,
        name: item.name,
        flavor: item.flavor,
        description: {
          uz: 'REPLACE_WITH_REAL_DATA',
          ru: 'REPLACE_WITH_REAL_DATA',
          en: 'REPLACE_WITH_REAL_DATA',
        },
        shelfLifeDays: 180,
      },
    });

    for (const variant of item.variants) {
      const saved = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: { volumeMl: variant.volumeMl },
        create: { productId: product.id, sku: variant.sku, volumeMl: variant.volumeMl },
      });

      const existingPrice = await prisma.productPrice.findFirst({
        where: { variantId: saved.id, validTo: null },
      });

      if (existingPrice === null) {
        await prisma.productPrice.create({
          data: { variantId: saved.id, amount: variant.amount, currency: 'UZS' },
        });
      }
    }
  }

  console.log(`  mahsulotlar: ${MOCK_PRODUCTS.length} ta (hammasi MOCK)`);
}

/**
 * Ishlab chiqarish bosqichlari (CLAUDE.md §4).
 *
 * Ketma-ketlik spec'da qat'iy belgilangan, shuning uchun u seed'da
 * yaratiladi. Sarlavhalar va tavsiflar esa CMS'dan tahrirlanadi —
 * tavsiflar hozircha REPLACE_WITH_REAL_DATA, chunki jarayon tafsilotlari
 * BARFF dan kelishi kerak.
 */
const PRODUCTION_STEPS = [
  { slug: 'xomashyo', uz: 'Xomashyo', ru: 'Сырьё', en: 'Raw materials' },
  { slug: 'qabul-qilish', uz: 'Qabul qilish', ru: 'Приёмка', en: 'Intake' },
  { slug: 'saralash', uz: 'Saralash', ru: 'Сортировка', en: 'Sorting' },
  { slug: 'ishlab-chiqarish', uz: 'Ishlab chiqarish', ru: 'Производство', en: 'Production' },
  { slug: 'sifat-nazorati', uz: 'Sifat nazorati', ru: 'Контроль качества', en: 'Quality control' },
  { slug: 'qadoqlash', uz: 'Qadoqlash', ru: 'Упаковка', en: 'Packaging' },
  { slug: 'ombor', uz: 'Ombor', ru: 'Склад', en: 'Warehouse' },
  { slug: 'yetkazib-berish', uz: 'Yetkazib berish', ru: 'Доставка', en: 'Delivery' },
];

async function seedProductionSteps(): Promise<void> {
  for (const [index, step] of PRODUCTION_STEPS.entries()) {
    await prisma.productionStep.upsert({
      where: { slug: step.slug },
      update: { displayOrder: index },
      create: {
        slug: step.slug,
        title: { uz: step.uz, ru: step.ru, en: step.en },
        description: {
          uz: 'REPLACE_WITH_REAL_DATA',
          ru: 'REPLACE_WITH_REAL_DATA',
          en: 'REPLACE_WITH_REAL_DATA',
        },
        displayOrder: index,
        // Tavsiflar to'ldirilmaguncha saytda ko'rinmaydi.
        status: 'DRAFT',
      },
    });
  }

  console.log(`  ishlab chiqarish bosqichlari: ${PRODUCTION_STEPS.length} ta (tavsiflar MOCK)`);
}

/**
 * Standart ombor.
 *
 * Bittasi BO'LISHI SHART: kelim yozish uchun omborchiga tayyor
 * ombor kerak, aks holda u avval kartochka yaratishi kerak bo'lardi
 * va birinchi kelim shu yerda to'xtab qolardi.
 *
 * Nomi va hududi MOCK — haqiqiy ombor manzillari BARFF dan
 * kelmagan (`docs/OPEN-QUESTIONS.md`, Q11).
 */
async function seedWarehouse(): Promise<void> {
  const existing = await prisma.warehouse.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (existing !== null) {
    console.log('  ombor: allaqachon bor');
    return;
  }

  await prisma.warehouse.create({
    data: {
      code: 'MAIN',
      name: 'Asosiy ombor (MOCK)',
      region: 'REPLACE_WITH_REAL_DATA',
      isDefault: true,
    },
  });

  console.log('  ombor: MAIN yaratildi (MOCK)');
}

async function main(): Promise<void> {
  console.log('Seed boshlandi');

  const permissionIds = await seedPermissions();
  const roleIds = await seedRoles(permissionIds);
  await seedAdmin(roleIds);
  await seedSettings();
  await seedMockProducts();
  await seedProductionSteps();
  await seedWarehouse();

  console.log('Seed tugadi');
}

main()
  .catch((error: unknown) => {
    console.error('Seed xatosi:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
