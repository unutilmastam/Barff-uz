import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { movementDelta } from '@barff/types';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const SLUG = `e2e-wh-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Wh-Admin-2026' },
  WAREHOUSE: { email: `${SLUG}-wh@barff.uz`, password: 'E2E-Wh-Wh-2026' },
  SALES: { email: `${SLUG}-sales@barff.uz`, password: 'E2E-Wh-Sales-2026' },
  LOGISTICS: { email: `${SLUG}-log@barff.uz`, password: 'E2E-Wh-Log-2026' },
} as const;

/**
 * Ombor qoldig'i (S30).
 *
 * ASOSIY DA'VO: **qoldiq harakatsiz o'zgarmaydi**. Bu servis
 * intizomi emas, BAZADAGI qoida — shuning uchun testlar uni
 * CHETLAB O'TISHGA urinib ko'radi: Prisma orqali to'g'ridan-to'g'ri
 * `UPDATE`, jurnal qatorini tahrirlash va o'chirish.
 *
 * Ikkinchi da'vo: bir vaqtda kelgan harakatlar bir-birini
 * YO'QOTMAYDI (S30 DoD: "concurrency tested").
 */
describe('Warehouse (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let warehouseId = '';
  let secondWarehouseId = '';

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const as = (role: keyof typeof STAFF, method: 'get' | 'post' | 'patch' | 'put', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);

  /** Joriy qoldiq — bazadan TO'G'RIDAN-TO'G'RI. */
  const stockOf = async (whId = warehouseId) =>
    prisma.warehouseStock.findFirst({
      where: { warehouseId: whId, productVariantId: variantId },
      select: { quantity: true, reservedQuantity: true },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: () =>
          Promise.resolve({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: false,
            timeToBlockExpire: 0,
          }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    const passwords = new PasswordService();

    for (const [code, creds] of Object.entries(STAFF)) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code } });
      await prisma.user.create({
        data: {
          email: creds.email,
          fullName: `E2E ${code}`,
          passwordHash: await passwords.hash(creds.password),
          roles: { create: { roleId: role.id } },
        },
      });
      tokens[code] = await login(creds.email, creds.password);
    }

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E ombor kat') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-WH-${STAMP}`,
        categoryId,
        name: L('E2E mahsulot'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-WH-V-${STAMP}`, volumeMl: 500 },
    });
    variantId = variant.id;

    const created = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({ code: `E2EWH${String(STAMP).slice(-6)}`, name: 'E2E ombor', region: 'Toshkent' })
      .expect(201);
    warehouseId = created.body.id as string;

    const second = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({ code: `E2EWH2${String(STAMP).slice(-6)}`, name: 'E2E ombor 2', region: 'Samarqand' })
      .expect(201);
    secondWarehouseId = second.body.id as string;
  });

  afterAll(async () => {
    /*
      Tozalash TRIGGERNI VAQTINCHA O'CHIRIB bajariladi.

      Bu qoidani buzish EMAS, balki uning kuchini tasdiqlaydi:
      jurnal qatorini oddiy yo'l bilan o'chirib BO'LMAYDI, hatto
      test ham. Ishlab chiqarishda bunday chaqiruv yo'q.
    */
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" DISABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.stockMovement.deleteMany({
      where: { warehouseId: { in: [warehouseId, secondWarehouseId] } },
    });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" ENABLE TRIGGER stock_movement_no_delete',
    );

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" DISABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouseStock.deleteMany({
      where: { warehouseId: { in: [warehouseId, secondWarehouseId] } },
    });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" ENABLE TRIGGER warehouse_stock_guard',
    );

    await prisma.warehouse.deleteMany({ where: { id: { in: [warehouseId, secondWarehouseId] } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({
      where: { entity: { in: ['warehouse', 'stock_movement', 'warehouse_stock'] } },
    });

    const emails = Object.values(STAFF).map((s) => s.email);
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await prisma.$disconnect();
    await app?.close();
  });

  // ===========================================================================
  // HARAKAT QOLDIQNI O'ZGARTIRADI
  // ===========================================================================

  it('kelim qoldiqni oshiradi va jurnalga KEYINGI holatni yozadi', async () => {
    const response = await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'IN', quantity: 100 })
      .expect(201);

    expect(response.body.quantityAfter).toBe(100);
    expect(response.body.reservedAfter).toBe(0);
    expect((await stockOf())?.quantity).toBe(100);
  });

  it('chiqim qoldiqni kamaytiradi', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'OUT', quantity: 30 })
      .expect(201);

    expect((await stockOf())?.quantity).toBe(70);
  });

  it('qaytim qoldiqni oshiradi', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'RETURN', quantity: 5 })
      .expect(201);

    expect((await stockOf())?.quantity).toBe(75);
  });

  // ===========================================================================
  // MUMKIN BO'LMAGAN HOLATLAR
  // ===========================================================================

  it('qoldiqdan ko‘p chiqim RAD ETILADI va qoldiq o‘zgarmaydi', async () => {
    const before = (await stockOf())?.quantity;

    const response = await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'OUT', quantity: 1_000 })
      .expect(400);

    expect(response.body.code).toBe('STOCK_INSUFFICIENT');
    expect((await stockOf())?.quantity).toBe(before);
  });

  it('nol miqdor rad etiladi', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'IN', quantity: 0 })
      .expect(400);
  });

  it('manfiy miqdor FAQAT tuzatishda — turi ishorani belgilaydi', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'IN', quantity: -10 })
      .expect(400);
  });

  // ===========================================================================
  // TUZATISH — SABAB SHART, RUXSAT ALOHIDA
  // ===========================================================================

  it('sababsiz tuzatish RAD ETILADI', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/adjustments')
      .send({ warehouseId, productVariantId: variantId, type: 'ADJUSTMENT', quantity: -5 })
      .expect(400);
  });

  it('sabab bilan tuzatish qoldiqni kamaytiradi', async () => {
    const before = (await stockOf())?.quantity ?? 0;

    await as('WAREHOUSE', 'post', '/warehouse/adjustments')
      .send({
        warehouseId,
        productVariantId: variantId,
        type: 'ADJUSTMENT',
        quantity: -5,
        reason: 'Inventarizatsiya: 5 dona yaroqsiz',
      })
      .expect(201);

    expect((await stockOf())?.quantity).toBe(before - 5);
  });

  it('tuzatish AUDIT jurnaliga sabab bilan tushadi', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { action: 'stock.adjusted', entity: 'stock_movement' },
      orderBy: { createdAt: 'desc' },
      select: { after: true, actorId: true },
    });

    expect(log).not.toBeNull();
    expect((log?.after as { reason?: string } | null)?.reason).toContain('Inventarizatsiya');
    expect(log?.actorId).not.toBeNull();
  });

  // ===========================================================================
  // ROL QAMROVI — SERVERDA
  // ===========================================================================

  it('SOTUVCHI qoldiqni ko‘ra ham olmaydi', async () => {
    await as('SALES', 'get', '/warehouse/stock').expect(403);
  });

  it('LOGISTIKA qoldiqni ko‘ra olmaydi — uning ishi yetkazish', async () => {
    await as('LOGISTICS', 'get', '/warehouse/stock').expect(403);
  });

  it('OMBORCHI qoldiqni ko‘radi', async () => {
    const response = await as(
      'WAREHOUSE',
      'get',
      `/warehouse/stock?warehouseId=${warehouseId}`,
    ).expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
  });

  it('autentifikatsiyasiz kirib bo‘lmaydi', async () => {
    await request(app.getHttpServer()).get(`${base}/warehouse/stock`).expect(401);
  });

  // ===========================================================================
  // ASOSIY DA'VO: QOLDIQNI CHETLAB O'ZGARTIRIB BO'LMAYDI
  // ===========================================================================

  it('qoldiqni TO‘G‘RIDAN-TO‘G‘RI o‘zgartirib bo‘lmaydi', async () => {
    const before = (await stockOf())?.quantity;

    await expect(
      prisma.warehouseStock.updateMany({
        where: { warehouseId, productVariantId: variantId },
        data: { quantity: 999_999 },
      }),
    ).rejects.toThrow();

    expect((await stockOf())?.quantity).toBe(before);
  });

  it('jurnal qatorini TAHRIRLAB bo‘lmaydi', async () => {
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { warehouseId },
      select: { id: true, quantity: true },
    });

    await expect(
      prisma.stockMovement.update({ where: { id: movement.id }, data: { quantity: 500 } }),
    ).rejects.toThrow();

    const after = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(movement.quantity);
  });

  it('jurnal qatorini O‘CHIRIB bo‘lmaydi', async () => {
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { warehouseId },
      select: { id: true },
    });

    await expect(prisma.stockMovement.delete({ where: { id: movement.id } })).rejects.toThrow();

    expect(await prisma.stockMovement.count({ where: { id: movement.id } })).toBe(1);
  });

  it('kuzatuv chegarasi qoldiq EMAS — u tahrirlanadi', async () => {
    await as('ADMIN', 'put', `/warehouse/stock/${warehouseId}/${variantId}/threshold`)
      .send({ lowStockThreshold: 20 })
      .expect(200);

    const row = await prisma.warehouseStock.findFirstOrThrow({
      where: { warehouseId, productVariantId: variantId },
      select: { lowStockThreshold: true },
    });
    expect(row.lowStockThreshold).toBe(20);
  });

  // ===========================================================================
  // POYGA (S30 DoD: "concurrency tested")
  // ===========================================================================

  /*
    PARALLEL SO'ROVLAR SONI ATAYLAB KICHIK.

    Avval yigirmata edi va sinov `ECONNRESET` bilan tushardi —
    ILOVADA emas, SINOV MUHITIDA: vitest fayllarni parallel
    yurgizadi va yigirmata bir vaqtdagi ulanish BOSHQA to'plamlarni
    ham socket'siz qoldirardi (`orders.e2e-spec` o'sha paytda
    `400` olardi).

    Da'vo SONGA emas, BIR VAQTDALIKKA bog'liq: sakkiztasi ham
    "o'qi -> hisobla -> yoz" yondashuvini yiqitadi.
  */
  const CONCURRENT = 8;

  it('BIR VAQTDA kelgan harakatlar bir-birini YO‘QOTMAYDI', async () => {
    const before = (await stockOf())?.quantity ?? 0;

    /*
      "O'qi -> hisobla -> yoz" yondashuvida bu sinov tushardi:
      sakkizta so'rov bir xil boshlang'ich qiymatni o'qib, oxirgisi
      qolganlarini ustidan yozardi va natija 40 emas, 5 bo'lardi.

      Qoldiq `INSERT ... ON CONFLICT DO UPDATE SET quantity =
      quantity + delta` bilan ATOMAR o'zgaradi, shuning uchun
      yo'qotish bo'lmaydi.
    */
    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        as('WAREHOUSE', 'post', '/warehouse/movements').send({
          warehouseId,
          productVariantId: variantId,
          type: 'IN',
          quantity: 5,
        }),
      ),
    );

    expect(results.every((r) => r.status === 201)).toBe(true);
    expect((await stockOf())?.quantity).toBe(before + CONCURRENT * 5);
  });

  it('BIR VAQTDA kelgan chiqimlar qoldiqni MANFIYGA tushira olmaydi', async () => {
    /*
      Qoldiq aniq 10 donaga KELTIRILADI — oshirib ham, kamaytirib
      ham. Avval faqat "ko'p bo'lsa kamaytir" edi va oldingi sinov
      tushganda bu ham ketidan tushardi: sabab bitta bo'lsa ham
      IKKITA qizil chiqardi va aybdorni topish qiyinlashardi.
    */
    const current = (await stockOf())?.quantity ?? 0;

    if (current !== 10) {
      await as('WAREHOUSE', 'post', '/warehouse/movements')
        .send({
          warehouseId,
          productVariantId: variantId,
          type: current > 10 ? 'OUT' : 'IN',
          quantity: Math.abs(current - 10),
        })
        .expect(201);
    }

    expect((await stockOf())?.quantity).toBe(10);

    /*
      Beshta so'rov, har biri 4 dona — jami 20, qoldiq esa 10.
      Ilovadagi "yetarlimi" tekshiruvi bilan HAMMASI o'tardi:
      beshalasi ham 10 ni ko'radi va 4 < 10 deb xulosa qiladi.
      Baza esa har bir yozuvda YANGILANGAN qoldiqni ko'radi.
    */
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        as('WAREHOUSE', 'post', '/warehouse/movements').send({
          warehouseId,
          productVariantId: variantId,
          type: 'OUT',
          quantity: 4,
        }),
      ),
    );

    const created = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 400).length;

    expect(created).toBe(2);
    expect(rejected).toBe(3);
    expect((await stockOf())?.quantity).toBe(2);
  });

  // ===========================================================================
  // ILOVA VA BAZA BIR XIL QOIDANI ISHLATADI
  // ===========================================================================

  /*
    `movementDelta()` (`@barff/types`) bazadagi
    `barff_apply_stock_movement()` triggeri bilan BIR XIL qoidani
    ifodalaydi. Ikkinchi nusxa ataylab: panel natijani OLDINDAN
    ko'rsatishi kerak, HAQIQIY hisob esa bazada bo'ladi.

    Ikki nusxa vaqt o'tib bir-biridan uzoqlashadi — agar ularni
    hech kim taqqoslamasa. Bu sinov aynan shuni qiladi: har bir
    turni HAQIQIY bazaga yozib, natijani ilovadagi funksiya
    bashorati bilan solishtiradi.
  */
  it('ilovadagi hisob BAZADAGI trigger bilan BIR XIL natija beradi', async () => {
    const cases = [
      { type: 'IN' as const, quantity: 40 },
      { type: 'RETURN' as const, quantity: 7 },
      { type: 'OUT' as const, quantity: 6 },
      { type: 'ADJUSTMENT' as const, quantity: -3, reason: 'Parity: kam chiqdi' },
      { type: 'ADJUSTMENT' as const, quantity: 9, reason: 'Parity: ortiqcha chiqdi' },
    ];

    for (const testCase of cases) {
      const before = await stockOf();
      const predicted = movementDelta(testCase.type, testCase.quantity);

      const path =
        testCase.type === 'ADJUSTMENT' ? '/warehouse/adjustments' : '/warehouse/movements';

      const response = await as('WAREHOUSE', 'post', path)
        .send({ warehouseId, productVariantId: variantId, ...testCase })
        .expect(201);

      const expected = (before?.quantity ?? 0) + predicted.quantity;

      expect(response.body.quantityAfter, `${testCase.type} ${testCase.quantity}`).toBe(expected);
      expect((await stockOf())?.quantity).toBe(expected);
    }
  });

  // ===========================================================================
  // KO'CHIRISH — IKKI TOMON, BITTA TRANZAKSIYA
  // ===========================================================================

  it('ko‘chirish bir ombordan olib ikkinchisiga qo‘shadi', async () => {
    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'IN', quantity: 50 })
      .expect(201);

    const fromBefore = (await stockOf())?.quantity ?? 0;

    await as('ADMIN', 'post', '/warehouse/transfers')
      .send({
        fromWarehouseId: warehouseId,
        toWarehouseId: secondWarehouseId,
        productVariantId: variantId,
        quantity: 20,
      })
      .expect(201);

    expect((await stockOf())?.quantity).toBe(fromBefore - 20);
    expect((await stockOf(secondWarehouseId))?.quantity).toBe(20);
  });

  it('yetarli qoldiqsiz ko‘chirish IKKALA tomonga ham tegmaydi', async () => {
    const fromBefore = (await stockOf())?.quantity ?? 0;
    const toBefore = (await stockOf(secondWarehouseId))?.quantity ?? 0;

    await as('ADMIN', 'post', '/warehouse/transfers')
      .send({
        fromWarehouseId: warehouseId,
        toWarehouseId: secondWarehouseId,
        productVariantId: variantId,
        quantity: 1_000_000,
      })
      .expect(400);

    // Tranzaksiya: chiqim yozilib kirim yozilmasligi MUMKIN EMAS.
    expect((await stockOf())?.quantity).toBe(fromBefore);
    expect((await stockOf(secondWarehouseId))?.quantity).toBe(toBefore);
  });

  it('ombor o‘ziga ko‘chira olmaydi', async () => {
    await as('ADMIN', 'post', '/warehouse/transfers')
      .send({
        fromWarehouseId: warehouseId,
        toWarehouseId: warehouseId,
        productVariantId: variantId,
        quantity: 1,
      })
      .expect(400);
  });

  // ===========================================================================
  // JURNAL
  // ===========================================================================

  it('jurnal har bir o‘zgarishni saqlaydi', async () => {
    const response = await as(
      'WAREHOUSE',
      'get',
      `/warehouse/movements?warehouseId=${warehouseId}&limit=100`,
    ).expect(200);

    const types = (response.body.items as { type: string }[]).map((m) => m.type);
    expect(types).toContain('IN');
    expect(types).toContain('OUT');
    expect(types).toContain('ADJUSTMENT');
    expect(types).toContain('RETURN');
    expect(types).toContain('TRANSFER');
  });

  it('ombor kodi TAKRORLANMAYDI', async () => {
    const existing = await prisma.warehouse.findUniqueOrThrow({
      where: { id: warehouseId },
      select: { code: true },
    });

    const response = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({ code: existing.code, name: 'Takror', region: 'Toshkent' })
      .expect(409);

    expect(response.body.code).toBe('WAREHOUSE_CODE_EXISTS');
  });
});
