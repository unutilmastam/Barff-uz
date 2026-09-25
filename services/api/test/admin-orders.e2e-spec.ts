import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const SLUG = `e2e-adm-ord-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

/** Har rol uchun alohida akkaunt — ruxsat qamrovi shu bilan tekshiriladi. */
const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-AdmOrd-Admin-2026' },
  SALES: { email: `${SLUG}-sales@barff.uz`, password: 'E2E-AdmOrd-Sales-2026' },
  WAREHOUSE: { email: `${SLUG}-wh@barff.uz`, password: 'E2E-AdmOrd-Wh-2026' },
  DRIVER: { email: `${SLUG}-driver@barff.uz`, password: 'E2E-AdmOrd-Driver-2026' },
} as const;

const DEALER = { email: `${SLUG}-dealer@barff.uz`, password: 'Diler-AdmOrd-2026' };

/**
 * Buyurtmalarni yuritish — ROL QAMROVI (S28 DoD).
 *
 * Asosiy da'vo: ruxsat ROL NOMIGA emas, AMALGA bog'langan va u
 * SERVERDA tekshiriladi. Panelda tugmani yashirish himoya emas
 * (CLAUDE.md §3), shuning uchun har bir rol endpoint'ni
 * TO'G'RIDAN-TO'G'RI chaqirib ko'radi.
 */
describe('Admin orders (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let dealerToken = '';
  let dealerId = '';
  let orderId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const as = (role: keyof typeof STAFF, method: 'get' | 'patch' | 'put', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);

  /*
    OMBOR QOLDIG'I — S31 DAN KEYIN SHART.

    `CONFIRMED -> RESERVED` endi HAQIQIY zaxira oladi va qoldiq
    yetmasa `409` qaytaradi (`docs/WAREHOUSE-POLICY.md`). Ya'ni
    holat mashinasini "bo'sh" sinab bo'lmaydi: bu sinovlar ilgari
    ombor umuman yo'q paytda yozilgan edi.

    Qoldiq SEED dagi standart omborga yoziladi. To'plamlar
    bir-biriga xalaqit bermaydi: qator (ombor + variant) bo'yicha
    alohida va har bir to'plamning O'Z varianti bor.
  */
  const stockUp = async (quantity = 10_000) => {
    const warehouse = await prisma.warehouse.findFirstOrThrow({
      where: { deletedAt: null, isActive: true },
      orderBy: { isDefault: 'desc' },
      select: { id: true },
    });

    await prisma.stockMovement.create({
      data: {
        warehouseId: warehouse.id,
        productVariantId: variantId,
        type: 'IN',
        quantity,
        reference: 'E2E setup',
      },
    });
  };

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

    // Katalog va diler.
    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E admin buyurtma kat') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-AO-${STAMP}`,
        categoryId,
        name: L('E2E mahsulot'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-AO-V-${STAMP}`, volumeMl: 1000 },
    });
    variantId = variant.id;

    await prisma.productPrice.create({ data: { variantId, amount: 100_000, currency: 'UZS' } });

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        region: 'Namangan',
        businessType: 'DISTRIBUTOR',
        contactName: 'Admin Ord Diler',
        phone: `+99891${String(3_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        ...DEALER,
      })
      .expect(202);

    const dealer = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG} MChJ` },
      select: { id: true },
    });
    dealerId = dealer.id;

    await as('ADMIN', 'patch', `/admin/dealers/${dealerId}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    dealerToken = await login(DEALER.email, DEALER.password);

    const address = await request(app.getHttpServer())
      .post(`${base}/dealer/addresses`)
      .set('Authorization', `Bearer ${dealerToken}`)
      .send({
        label: 'Ombor',
        region: 'Namangan',
        street: 'Sanoat 5',
        contactName: 'Qabul',
        contactPhone: '+998901234567',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base}/dealer/cart/items`)
      .set('Authorization', `Bearer ${dealerToken}`)
      .send({ variantId, quantity: 3 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post(`${base}/dealer/orders`)
      .set('Authorization', `Bearer ${dealerToken}`)
      .send({ addressId: address.body.id })
      .expect(201);

    orderId = order.body.id as string;

    await stockUp();
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { dealerId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    /*
      OMBOR IZLARI — jurnal QATORLARI o'chirilmaydi (S30), shuning
      uchun trigger vaqtincha uzib qo'yiladi. Bu qoidani buzish
      emas, uning kuchini tasdiqlaydi: oddiy yo'l bilan o'chirib
      BO'LMAYDI.
    */
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" DISABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.stockReservation.deleteMany({ where: { productVariantId: variantId } });
    await prisma.stockMovement.deleteMany({ where: { productVariantId: variantId } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" ENABLE TRIGGER stock_movement_no_delete',
    );

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" DISABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouseStock.deleteMany({ where: { productVariantId: variantId } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" ENABLE TRIGGER warehouse_stock_guard',
    );

    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { dealerId } } });
    await prisma.cart.deleteMany({ where: { dealerId } });
    await prisma.dealerAddress.deleteMany({ where: { dealerId } });
    await prisma.dealerEvent.deleteMany({ where: { dealerId } });

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { userId: true },
    });

    await prisma.dealer.deleteMany({ where: { id: dealerId } });
    await prisma.productPrice.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { entity: { in: ['order', 'dealer'] } } });
    await prisma.notification.deleteMany({
      where: { event: { in: ['order.created', 'dealer.registered', 'dealer.status.changed'] } },
    });

    const emails = [...Object.values(STAFF).map((s) => s.email), DEALER.email];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (dealer !== null) userIds.push(dealer.userId);

    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await prisma.$disconnect();
    await app?.close();
  });

  // ===========================================================================
  // ROL QAMROVI — S28 DoD
  // ===========================================================================

  describe('rol qamrovi', () => {
    it('SALES buyurtmalarni KO‘RADI', async () => {
      const response = await as('SALES', 'get', '/admin/orders').expect(200);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('WAREHOUSE ham KO‘RADI', async () => {
      await as('WAREHOUSE', 'get', '/admin/orders').expect(200);
    });

    it('DRIVER buyurtmalarni KO‘RA OLMAYDI (403)', async () => {
      // Haydovchida `orders.view` yo'q — faqat o'ziga biriktirilgan
      // yetkazmalar (S33).
      await as('DRIVER', 'get', '/admin/orders').expect(403);
    });

    it('DILER admin endpoint‘iga umuman kira olmaydi (403)', async () => {
      await request(app.getHttpServer())
        .get(`${base}/admin/orders`)
        .set('Authorization', `Bearer ${dealerToken}`)
        .expect(403);
    });

    it('tokensiz 401', async () => {
      await request(app.getHttpServer()).get(`${base}/admin/orders`).expect(401);
    });

    /**
     * ASOSIY DA'VO: OMBOR XODIMI HOLATNI O'ZGARTIRA OLADI.
     *
     * S26 da endpoint `orders.manage` bilan qo'riqlangan edi, lekin
     * ruxsat katalogida omborga `orders.status.change` berilgan —
     * ya'ni ombor xodimi buyurtmani "PICKING" ga o'tkaza OLMASDI.
     * Bu test aynan o'sha nomuvofiqlikni ushlaydi.
     */
    it('WAREHOUSE holatni O‘ZGARTIRA OLADI', async () => {
      await as('WAREHOUSE', 'patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
    });

    it('SALES holatni o‘zgartira OLMAYDI (403)', async () => {
      // Sotuvchida `orders.status.change` YO'Q — u ko'radi, lekin
      // omborning ishiga aralashmaydi.
      const response = await as('SALES', 'patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'RESERVED' })
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN_PERMISSION');
    });

    it('WAREHOUSE ichki izoh yoza OLMAYDI (403)', async () => {
      // `orders.manage` faqat adminda.
      await as('WAREHOUSE', 'put', `/admin/orders/${orderId}/internal-note`)
        .send({ internalNote: 'Ombor izohi' })
        .expect(403);
    });

    it('ADMIN hamma amalni bajara oladi', async () => {
      await as('ADMIN', 'get', `/admin/orders/${orderId}`).expect(200);
      await as('ADMIN', 'put', `/admin/orders/${orderId}/internal-note`)
        .send({ internalNote: 'To‘lov kechikmoqda' })
        .expect(200);
      await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'RESERVED' })
        .expect(200);
    });
  });

  // ===========================================================================
  // ICHKI IZOH DILERGA KO'RINMAYDI
  // ===========================================================================

  it('ICHKI IZOH dilerga KO‘RSATILMAYDI', async () => {
    const response = await request(app.getHttpServer())
      .get(`${base}/dealer/orders/${orderId}`)
      .set('Authorization', `Bearer ${dealerToken}`)
      .expect(200);

    expect(response.body.internalNote).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('To‘lov kechikmoqda');
  });

  it('ADMIN esa ichki izohni KO‘RADI', async () => {
    const response = await as('ADMIN', 'get', `/admin/orders/${orderId}`).expect(200);

    expect(response.body.internalNote).toBe('To‘lov kechikmoqda');
  });

  // ===========================================================================
  // AUDIT — S28 DoD
  // ===========================================================================

  it('har bir holat o‘zgarishi AKTYOR va OLDINGI/YANGI holat bilan yoziladi', async () => {
    const entries = await prisma.auditLog.findMany({
      where: { entity: 'order', entityId: orderId, action: 'order.status.changed' },
      orderBy: { createdAt: 'asc' },
    });

    expect(entries.length).toBeGreaterThanOrEqual(2);

    // Birinchisi — ombor xodimi, ikkinchisi — admin.
    expect(entries[0]?.actorEmail).toBe(STAFF.WAREHOUSE.email);
    expect(entries[0]?.before).toMatchObject({ status: 'PENDING_REVIEW' });
    expect(entries[0]?.after).toMatchObject({ status: 'CONFIRMED' });

    expect(entries[1]?.actorEmail).toBe(STAFF.ADMIN.email);
  });

  it('ichki izoh o‘zgarishi ham AUDIT ga tushadi', async () => {
    const entry = await prisma.auditLog.findFirst({
      where: { entity: 'order', entityId: orderId, action: 'order.note.changed' },
    });

    expect(entry).not.toBeNull();
    expect(entry?.actorEmail).toBe(STAFF.ADMIN.email);
  });

  // ===========================================================================
  // FILTRLAR
  // ===========================================================================

  describe('filtrlar', () => {
    it('holat bo‘yicha', async () => {
      const ours = await as('ADMIN', 'get', '/admin/orders?status=RESERVED').expect(200);
      expect((ours.body.items as { id: string }[]).some((o) => o.id === orderId)).toBe(true);

      const other = await as('ADMIN', 'get', '/admin/orders?status=DELIVERED').expect(200);
      expect((other.body.items as { id: string }[]).some((o) => o.id === orderId)).toBe(false);
    });

    it('diler bo‘yicha', async () => {
      const response = await as('ADMIN', 'get', `/admin/orders?dealerId=${dealerId}`).expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      expect(
        (response.body.items as { dealer: { id: string } }[]).every(
          (o) => o.dealer.id === dealerId,
        ),
      ).toBe(true);
    });

    it('hudud bo‘yicha', async () => {
      const ours = await as('ADMIN', 'get', '/admin/orders?region=Namangan').expect(200);
      expect((ours.body.items as { id: string }[]).some((o) => o.id === orderId)).toBe(true);

      const other = await as('ADMIN', 'get', '/admin/orders?region=Xorazm').expect(200);
      expect((other.body.items as { id: string }[]).some((o) => o.id === orderId)).toBe(false);
    });

    it('raqam bo‘yicha qidiruv', async () => {
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { number: true },
      });

      const response = await as('ADMIN', 'get', `/admin/orders?search=${order.number}`).expect(200);
      expect(response.body.items).toHaveLength(1);
    });

    /**
     * SANA FILTRI KUN OXIRIGACHA.
     *
     * `createdAt <= to` bilan `to` = bugun berilsa, bugungi
     * buyurtmalar TUSHIB QOLARDI (00:00 dan keyingilari). Xodim
     * "bugungi buyurtmalar" ni so'rab bo'sh ro'yxat ko'rardi.
     */
    it('BUGUNGI sana oralig‘i bugungi buyurtmani TOPADI', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const response = await as(
        'ADMIN',
        'get',
        `/admin/orders?from=${today}&to=${today}&dealerId=${dealerId}`,
      ).expect(200);

      expect((response.body.items as { id: string }[]).some((o) => o.id === orderId)).toBe(true);
    });

    it('kelajakdagi sana oralig‘i hech narsa topmaydi', async () => {
      const response = await as('ADMIN', 'get', '/admin/orders?from=2099-01-01').expect(200);
      expect(response.body.items).toEqual([]);
    });
  });
});
