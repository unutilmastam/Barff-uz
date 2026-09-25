import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const SLUG = `e2e-res-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Res-Admin-2026' },
  WAREHOUSE: { email: `${SLUG}-wh@barff.uz`, password: 'E2E-Res-Wh-2026' },
} as const;

/**
 * Zaxira, yig'ish va qadoqlash (S31).
 *
 * ASOSIY DA'VO (S31 DoD): **bir vaqtda kelgan buyurtmalar bir xil
 * tovarni IKKI MARTA zaxiraga ola olmaydi.**
 *
 * Bu servis mantiqi bilan emas, BAZA bilan ta'minlanadi:
 * `reservedQuantity > quantity` S30 dagi trigger bilan taqiqlangan.
 * Shuning uchun sinov ikkita buyurtmani BIR VAQTDA yuboradi —
 * ketma-ket yuborish oson holat va u hech narsani isbotlamaydi.
 *
 * Siyosat `docs/WAREHOUSE-POLICY.md` da yozilgan; bu sinov o'sha
 * hujjatdagi har bir qarorni tekshiradi.
 */
describe('Reservations (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let dealerToken = '';
  let dealerId = '';
  let addressId = '';
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

  const as = (role: keyof typeof STAFF, method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);

  const asDealer = (method: 'get' | 'post', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${dealerToken}`);

  const stockOf = async (whId = warehouseId) =>
    prisma.warehouseStock.findFirst({
      where: { warehouseId: whId, productVariantId: variantId },
      select: { quantity: true, reservedQuantity: true },
    });

  /** Qoldiqni ANIQ qiymatga keltiradi — sinovlar bir-biriga bog'liq bo'lmasin. */
  const setStock = async (target: number, whId = warehouseId) => {
    const current = (await stockOf(whId))?.quantity ?? 0;
    if (current === target) return;

    await as('WAREHOUSE', 'post', '/warehouse/movements')
      .send({
        warehouseId: whId,
        productVariantId: variantId,
        type: current > target ? 'OUT' : 'IN',
        quantity: Math.abs(current - target),
      })
      .expect(201);
  };

  /** Savatni to'ldirib buyurtma yaratadi va uni `CONFIRMED` ga o'tkazadi. */
  const makeConfirmedOrder = async (quantity: number) => {
    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity }).expect(201);

    const created = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
    const orderId = created.body.id as string;

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(200);

    return orderId;
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

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E zaxira kat') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-RES-${STAMP}`,
        categoryId,
        name: L('E2E mahsulot'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-RES-V-${STAMP}`, volumeMl: 1000 },
    });
    variantId = variant.id;

    await prisma.productPrice.create({ data: { variantId, amount: 50_000, currency: 'UZS' } });

    const warehouse = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({
        code: `E2ERES${String(STAMP).slice(-6)}`,
        name: 'E2E zaxira ombori',
        region: 'Toshkent',
      })
      .expect(201);
    warehouseId = warehouse.body.id as string;

    const second = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({ code: `E2ERES2${String(STAMP).slice(-5)}`, name: 'E2E ikkinchi', region: 'Buxoro' })
      .expect(201);
    secondWarehouseId = second.body.id as string;

    // Diler.
    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        region: 'Toshkent',
        businessType: 'DISTRIBUTOR',
        contactName: 'Zaxira Diler',
        phone: `+99893${String(4_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        email: `${SLUG}-dealer@barff.uz`,
        password: 'Diler-Zaxira-2026',
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

    dealerToken = await login(`${SLUG}-dealer@barff.uz`, 'Diler-Zaxira-2026');

    const address = await asDealer('post', '/dealer/addresses')
      .send({
        label: 'Ombor',
        region: 'Toshkent',
        street: 'Zaxira 1',
        contactName: 'Qabul',
        contactPhone: '+998901112233',
      })
      .expect(201);
    addressId = address.body.id as string;
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { dealerId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    await prisma.stockReservation.deleteMany({ where: { orderId: { in: orderIds } } });
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
    await prisma.productPrice.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({
      where: { entity: { in: ['order', 'dealer', 'warehouse', 'stock_movement'] } },
    });
    await prisma.notification.deleteMany({
      where: {
        event: { in: ['stock.low', 'order.created', 'dealer.registered', 'dealer.status.changed'] },
      },
    });

    const emails = [...Object.values(STAFF).map((s) => s.email), `${SLUG}-dealer@barff.uz`];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (dealer !== null) userIds.push(dealer.userId);

    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await prisma.$disconnect();
    await app?.close();
  });

  /*
    HAR BIR SINOV TOZA QOLDIQ BILAN BOSHLANADI.

    Zaxiralar AVVAL bo'shatiladi, keyin qoldiq qo'yiladi — teskari
    tartibda `setStock` ning O'ZI yiqilardi: 100 donadan 5 ga
    tushirish oldingi sinovdan qolgan 10 dona band bilan
    `reservedQuantity > quantity` beradi va bazadagi tekshiruv uni
    rad etadi.

    Men aynan shunga tushdim va sinov "400" deb ko'rsatdi — aybdor
    ilova emas, tozalash tartibi edi.
  */
  beforeEach(async () => {
    const orders = await prisma.order.findMany({
      where: { dealerId, reservations: { some: { status: { in: ['ACTIVE', 'FULFILLED'] } } } },
      select: { id: true },
    });

    for (const order of orders) {
      await as('WAREHOUSE', 'post', `/warehouse/reservations/${order.id}/release`).expect(201);
    }

    await setStock(0, secondWarehouseId);
    await setStock(100);
  });

  // ===========================================================================
  // ZAXIRAGA OLISH
  // ===========================================================================

  it('`RESERVED` ga o‘tish tovarni BAND qiladi, qoldiqqa tegmaydi', async () => {
    const orderId = await makeConfirmedOrder(10);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);

    const stock = await stockOf();
    expect(stock?.quantity).toBe(100);
    expect(stock?.reservedQuantity).toBe(10);

    const reservations = await prisma.stockReservation.findMany({
      where: { orderId },
      select: { status: true, quantity: true },
    });
    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.status).toBe('ACTIVE');
    expect(reservations[0]?.quantity).toBe(10);
  });

  it('qoldiq yetmasa buyurtma `RESERVED` ga O‘TMAYDI', async () => {
    await setStock(5);
    const orderId = await makeConfirmedOrder(50);

    const response = await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(409);

    expect(response.body.code).toBe('STOCK_SHORTFALL');

    /*
      ENG MUHIMI: buyurtma HOLATI o'zgarmagan.

      Teskari tartibda (avval holat, keyin zaxira) buyurtma
      "zaxiraga olindi" deb ko'rinib, aslida hech narsa ushlab
      turilmagan bo'lardi — va buni faqat yig'ish paytida
      omborchi payqardi.
    */
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order.status).toBe('CONFIRMED');

    expect(await prisma.stockReservation.count({ where: { orderId } })).toBe(0);
  });

  it('yetmagan pozitsiya javobda ANIQ ko‘rsatiladi', async () => {
    await setStock(7);
    const orderId = await makeConfirmedOrder(20);

    const response = await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(409);

    /*
      `details` FAQAT `Record<string, string[]>` bo'la oladi — xato
      filtri boshqa shaklni tashlab yuboradi (javob shakli bitta
      bo'lsin degan qaror). Men avval u yerga massiv obyekt
      yuborgan edim va u JIMGINA yo'qoldi.
    */
    const shortfall = response.body.details?.shortfall as string[] | undefined;

    expect(shortfall).toHaveLength(1);
    expect(shortfall?.[0]).toContain('kerak 20');
    expect(shortfall?.[0]).toContain('mavjud 7');
  });

  // ===========================================================================
  // ASOSIY DA'VO: HADDAN ZIYOD ZAXIRA MUMKIN EMAS
  // ===========================================================================

  it('BIR VAQTDA kelgan ikki buyurtma bir tovarni IKKI MARTA zaxiraga OLA OLMAYDI', async () => {
    // Qoldiq 30, har bir buyurtma 20 ta so'raydi — ikkalasi sig'maydi.
    await setStock(30);

    const first = await makeConfirmedOrder(20);
    const second = await makeConfirmedOrder(20);

    /*
      IKKALASI BIR VAQTDA.

      Ketma-ket yuborish OSON holat: ikkinchisi birinchining
      natijasini ko'radi. Qiyini — poyga: ikkalasi ham "30 dona
      bor, 20 sig'adi" deb xulosa qiladi va ilovadagi tekshiruv
      ikkalasini ham o'tkazib yuborardi.
    */
    const [a, b] = await Promise.all([
      as('ADMIN', 'patch', `/admin/orders/${first}/status`).send({ status: 'RESERVED' }),
      as('ADMIN', 'patch', `/admin/orders/${second}/status`).send({ status: 'RESERVED' }),
    ]);

    const ok = [a, b].filter((r) => r.status === 200).length;
    const rejected = [a, b].filter((r) => r.status === 409).length;

    expect(ok).toBe(1);
    expect(rejected).toBe(1);

    const stock = await stockOf();
    expect(stock?.reservedQuantity).toBe(20);
    // VA BAND QOLDIQDAN OSHMAGAN — asosiy invariant.
    expect(stock?.reservedQuantity).toBeLessThanOrEqual(stock?.quantity ?? 0);
  });

  it('aynan sig‘adigan ikkita buyurtma IKKALASI ham o‘tadi', async () => {
    await setStock(40);

    const first = await makeConfirmedOrder(20);
    const second = await makeConfirmedOrder(20);

    const [a, b] = await Promise.all([
      as('ADMIN', 'patch', `/admin/orders/${first}/status`).send({ status: 'RESERVED' }),
      as('ADMIN', 'patch', `/admin/orders/${second}/status`).send({ status: 'RESERVED' }),
    ]);

    // Chegara HADDAN ZIYOD qattiq bo'lmasligi ham kerak.
    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await stockOf())?.reservedQuantity).toBe(40);
  });

  // ===========================================================================
  // QISMAN BAJARISH YO'Q (`docs/WAREHOUSE-POLICY.md` §1)
  // ===========================================================================

  it('bitta pozitsiya yetmasa BUTUN buyurtma zaxiraga olinmaydi', async () => {
    const other = await prisma.productVariant.create({
      data: { productId, sku: `${SLUG}-ikkinchi`, volumeMl: 500 },
      select: { id: true },
    });
    await prisma.productPrice.create({
      data: { variantId: other.id, amount: 30_000, currency: 'UZS' },
    });

    try {
      // Birinchisiga qoldiq bor, ikkinchisiga YO'Q.
      await setStock(100);

      await asDealer('post', '/dealer/cart/items').send({ variantId, quantity: 5 }).expect(201);
      await asDealer('post', '/dealer/cart/items')
        .send({ variantId: other.id, quantity: 5 })
        .expect(201);

      const created = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
      const orderId = created.body.id as string;

      await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'RESERVED' })
        .expect(409);

      // HECH BIRI zaxiraga olinmagan — yarim zaxira bo'lmaydi.
      expect(await prisma.stockReservation.count({ where: { orderId } })).toBe(0);
      expect((await stockOf())?.reservedQuantity).toBe(0);
    } finally {
      await prisma.cartItem.deleteMany({ where: { variantId: other.id } });
      await prisma.stockReservation.deleteMany({ where: { productVariantId: other.id } });
      await prisma.orderItem.deleteMany({ where: { variantId: other.id } });
      await prisma.productPrice.deleteMany({ where: { variantId: other.id } });
      await prisma.productVariant.delete({ where: { id: other.id } });
    }
  });

  // ===========================================================================
  // QADOQLASH — TARTIB QAT'IY
  // ===========================================================================

  it('`PACKED` tovarni ombordan CHIQARADI va bandni bo‘shatadi', async () => {
    const orderId = await makeConfirmedOrder(15);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PICKING' })
      .expect(200);

    // Yig'ish qoldiqqa TEGMAYDI.
    expect((await stockOf())?.quantity).toBe(100);
    expect((await stockOf())?.reservedQuantity).toBe(15);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PACKED' })
      .expect(200);

    const stock = await stockOf();
    expect(stock?.quantity).toBe(85);
    expect(stock?.reservedQuantity).toBe(0);

    const reservation = await prisma.stockReservation.findFirstOrThrow({
      where: { orderId },
      select: { status: true, fulfilledAt: true },
    });
    expect(reservation.status).toBe('FULFILLED');
    expect(reservation.fulfilledAt).not.toBeNull();
  });

  it('qadoqlashda AVVAL bo‘shatish, KEYIN chiqim yoziladi', async () => {
    const orderId = await makeConfirmedOrder(15);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PICKING' })
      .expect(200);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PACKED' })
      .expect(200);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { number: true },
    });

    const movements = await prisma.stockMovement.findMany({
      where: { reference: order.number, type: { in: ['RELEASED', 'OUT'] } },
      orderBy: { createdAt: 'asc' },
      select: { type: true },
    });

    /*
      TARTIB MUHIM. Teskari tartibda oraliq holatda
      `reservedQuantity > quantity` bo'lib qolardi va bazadagi
      tekshiruv BUTUN tranzaksiyani rad etardi — ya'ni qadoqlash
      umuman ishlamasdi.
    */
    expect(movements.map((m) => m.type)).toEqual(['RELEASED', 'OUT']);
  });

  // ===========================================================================
  // BEKOR QILISH (`docs/WAREHOUSE-POLICY.md` §4)
  // ===========================================================================

  it('zaxiradagi buyurtmani bekor qilish bandni BO‘SHATADI', async () => {
    const orderId = await makeConfirmedOrder(25);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);
    expect((await stockOf())?.reservedQuantity).toBe(25);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    const stock = await stockOf();
    expect(stock?.reservedQuantity).toBe(0);
    // Tovar javonda edi — qoldiq O'ZGARMAYDI.
    expect(stock?.quantity).toBe(100);
  });

  it('QADOQLANGAN buyurtmani bekor qilish tovarni QAYTARADI', async () => {
    const orderId = await makeConfirmedOrder(25);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PICKING' })
      .expect(200);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'PACKED' })
      .expect(200);

    expect((await stockOf())?.quantity).toBe(75);

    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    /*
      Tovar CHIQIB KETGAN edi — `RELEASED` bilan qaytarib
      bo'lmaydi. `RETURN` yozilmasa, qoldiq haqiqatdan KAM
      ko'rinib qolardi va inventarizatsiyada "yo'qolgan" tovar
      paydo bo'lardi.
    */
    expect((await stockOf())?.quantity).toBe(100);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { number: true },
    });
    const returns = await prisma.stockMovement.count({
      where: { reference: order.number, type: 'RETURN' },
    });
    expect(returns).toBe(1);
  });

  // ===========================================================================
  // YIG'ISH VARAQASI
  // ===========================================================================

  it('yig‘ish varaqasi zaxiradagi pozitsiyalarni beradi', async () => {
    const orderId = await makeConfirmedOrder(12);
    await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`)
      .send({ status: 'RESERVED' })
      .expect(200);

    const response = await as('WAREHOUSE', 'get', `/warehouse/picking/${orderId}`).expect(200);

    expect(response.body.order.number).toMatch(/^BRF-/);
    expect(response.body.lines).toHaveLength(1);
    expect(response.body.lines[0].quantity).toBe(12);
    expect(response.body.lines[0].warehouse.id).toBe(warehouseId);
  });

  it('yig‘ish navbati `queue` so‘zini buyurtma id si deb O‘QIMAYDI', async () => {
    // S28 dagi tuzoq: statik marshrut `:id` dan OLDIN turishi kerak.
    const response = await as('WAREHOUSE', 'get', '/warehouse/picking/queue').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  // ===========================================================================
  // ROL QAMROVI
  // ===========================================================================

  it('yig‘ish varaqasi autentifikatsiyasiz berilmaydi', async () => {
    await request(app.getHttpServer()).get(`${base}/warehouse/picking/queue`).expect(401);
  });
});
