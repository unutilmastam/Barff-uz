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

async function main(): Promise<void> {
  console.log('Seed boshlandi');

  const permissionIds = await seedPermissions();
  const roleIds = await seedRoles(permissionIds);
  await seedAdmin(roleIds);
  await seedSettings();

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
