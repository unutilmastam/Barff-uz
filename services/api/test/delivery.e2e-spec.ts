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
const SLUG = `e2e-dlv-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Dlv-Admin-2026' },
  LOGISTICS: { email: `${SLUG}-log@barff.uz`, password: 'E2E-Dlv-Log-2026' },
  DRIVER: { email: `${SLUG}-driver@barff.uz`, password: 'E2E-Dlv-Driver-2026' },
  DRIVER2: { email: `${SLUG}-driver2@barff.uz`, password: 'E2E-Dlv-Driver2-2026' },
  WAREHOUSE: { email: `${SLUG}-wh@barff.uz`, password: 'E2E-Dlv-Wh-2026' },
} as const;

/**
 * Yetkazib berish (S32).
 *
 * UCHTA DA'VO (S32 DoD):
 *
 * 1. Haydovchi FAQAT o'z yetkazmasiga tegadi — va boshqasini
 *    `404` ko'radi, `403` emas (`docs/DELIVERY-POLICY.md` §4).
 * 2. Ruxsat etilmagan o'tish rad etiladi.
 * 3. Har bir o'tish HODISA sifatida yoziladi.
 *
 * To'rtinchisi ham shu yerda: yetkazma BUYURTMANI yetaklaydi va
 * `FAILED` unga TEGMAYDI.
 */
describe('Delivery (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let dealerToken = '';
  let dealerId = '';
  let addressId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let warehouseId = '';
  let driverId = '';
  let driver2Id = '';
  let vehicleId = '';

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

  const asDealer = (method: 'get' | 'post', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${dealerToken}`);

  /** Buyurtmani `READY_FOR_DELIVERY` gacha olib boradi — yetkazma shunda tug'iladi. */
  const makeReadyOrder = async (quantity = 4) => {
    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity }).expect(201);
    const created = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
    const orderId = created.body.id as string;

    for (const status of ['CONFIRMED', 'RESERVED', 'PICKING', 'PACKED', 'READY_FOR_DELIVERY']) {
      await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`).send({ status }).expect(200);
    }

    const delivery = await prisma.delivery.findFirstOrThrow({
      where: { orderId },
      select: { id: true, number: true, status: true },
    });

    return { orderId, delivery };
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

    for (const [key, creds] of Object.entries(STAFF)) {
      // `DRIVER2` ham `DRIVER` rolini oladi.
      const code = key === 'DRIVER2' ? 'DRIVER' : key;
      const role = await prisma.role.findUniqueOrThrow({ where: { code } });

      await prisma.user.create({
        data: {
          email: creds.email,
          fullName: `E2E ${key}`,
          passwordHash: await passwords.hash(creds.password),
          roles: { create: { roleId: role.id } },
        },
      });
      tokens[key] = await login(creds.email, creds.password);
    }

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E yetkazma kat') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-DLV-${STAMP}`,
        categoryId,
        name: L('E2E mahsulot'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-DLV-V-${STAMP}`, volumeMl: 1500 },
    });
    variantId = variant.id;

    await prisma.productPrice.create({ data: { variantId, amount: 40_000, currency: 'UZS' } });

    const warehouse = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({
        code: `E2EDLV${String(STAMP).slice(-6)}`,
        name: 'E2E yetkazma ombori',
        region: 'Toshkent',
      })
      .expect(201);
    warehouseId = warehouse.body.id as string;

    await as('ADMIN', 'post', '/warehouse/movements')
      .send({ warehouseId, productVariantId: variantId, type: 'IN', quantity: 1_000 })
      .expect(201);

    // Park.
    const vehicle = await as('ADMIN', 'post', '/delivery/vehicles')
      .send({ plateNumber: `01A${String(STAMP).slice(-5)}AA`, model: 'Isuzu' })
      .expect(201);
    vehicleId = vehicle.body.id as string;

    const driverUser = await prisma.user.findFirstOrThrow({
      where: { email: STAFF.DRIVER.email },
      select: { id: true },
    });
    const driver = await as('ADMIN', 'post', '/delivery/drivers')
      .send({ userId: driverUser.id, licenseNumber: 'AA1234567', vehicleId })
      .expect(201);
    driverId = driver.body.id as string;

    const driver2User = await prisma.user.findFirstOrThrow({
      where: { email: STAFF.DRIVER2.email },
      select: { id: true },
    });
    const driver2 = await as('ADMIN', 'post', '/delivery/drivers')
      .send({ userId: driver2User.id })
      .expect(201);
    driver2Id = driver2.body.id as string;

    // Diler.
    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        region: 'Toshkent',
        businessType: 'DISTRIBUTOR',
        contactName: 'Yetkazma Diler',
        phone: `+99897${String(5_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        email: `${SLUG}-dealer@barff.uz`,
        password: 'Diler-Yetkazma-2026',
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

    dealerToken = await login(`${SLUG}-dealer@barff.uz`, 'Diler-Yetkazma-2026');

    const address = await asDealer('post', '/dealer/addresses')
      .send({
        label: 'Ombor',
        region: 'Toshkent',
        street: 'Yetkazma 1',
        contactName: 'Qabul',
        contactPhone: '+998901112244',
      })
      .expect(201);
    addressId = address.body.id as string;
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { dealerId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    await prisma.deliveryEvent.deleteMany({ where: { delivery: { orderId: { in: orderIds } } } });
    await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
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

    await prisma.driver.deleteMany({ where: { id: { in: [driverId, driver2Id] } } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" DISABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.stockMovement.deleteMany({ where: { warehouseId } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" ENABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" DISABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouseStock.deleteMany({ where: { warehouseId } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" ENABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouse.deleteMany({ where: { id: warehouseId } });

    await prisma.productPrice.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({
      where: { entity: { in: ['order', 'dealer', 'delivery', 'driver', 'vehicle', 'warehouse'] } },
    });

    const emails = [...Object.values(STAFF).map((s) => s.email), `${SLUG}-dealer@barff.uz`];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (dealer !== null) userIds.push(dealer.userId);

    await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await prisma.$disconnect();
    await app?.close();
  });

  // ===========================================================================
  // YETKAZMA TUG'ILISHI
  // ===========================================================================

  it('yetkazma `READY_FOR_DELIVERY` da AVTOMATIK tug‘iladi', async () => {
    const { delivery } = await makeReadyOrder();

    expect(delivery.number).toMatch(/^DLV-\d{4}-\d{6}$/);
    expect(delivery.status).toBe('CREATED');
  });

  it('yetkazma manzilni NUSXA sifatida saqlaydi', async () => {
    const { delivery } = await makeReadyOrder();

    const row = await prisma.delivery.findUniqueOrThrow({
      where: { id: delivery.id },
      select: { shippingRegion: true, contactName: true, shippingAddress: true },
    });

    // Diler manzilini keyin o'chirsa ham, tovar QAYERGA ketgani qoladi.
    expect(row.shippingRegion).toBe('Toshkent');
    expect(row.contactName).toBe('Qabul');
    expect(row.shippingAddress).toContain('Yetkazma 1');
  });

  it('yetkazma raqamlari TAKRORLANMAYDI', async () => {
    const a = await makeReadyOrder();
    const b = await makeReadyOrder();

    expect(a.delivery.number).not.toBe(b.delivery.number);
  });

  // ===========================================================================
  // BIRIKTIRISH VA MOSLIK
  // ===========================================================================

  it('biriktirish yetkazmani `ASSIGNED`, buyurtmani `DRIVER_ASSIGNED` qiladi', async () => {
    const { orderId, delivery } = await makeReadyOrder();

    const response = await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    expect(response.body.status).toBe('ASSIGNED');

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order.status).toBe('DRIVER_ASSIGNED');
  });

  it('UCHTA yetkazma holati buyurtmaning BITTA holatiga tushadi', async () => {
    const { orderId, delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    /*
      `PICKED_UP`, `IN_TRANSIT` va `ARRIVED` — uchalasi ham
      buyurtmada `IN_TRANSIT`. Ikkinchi va uchinchisi
      o'zini-o'ziga o'tish bo'lardi va buyurtma mashinasi uni rad
      etardi — o'shanda haydovchi "yetib keldim" tugmasini bosa
      olmasdi (`docs/DELIVERY-POLICY.md` §2).
    */
    for (const status of ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] as const) {
      await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
        .send({ status })
        .expect(200);

      const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true },
      });
      expect(order.status, status).toBe('IN_TRANSIT');
    }
  });

  it('`DELIVERED` buyurtmani ham YAKUNLAYDI', async () => {
    const { orderId, delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    for (const status of ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] as const) {
      await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
        .send({ status })
        .expect(200);
    }

    await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'DELIVERED', receivedBy: 'Qabul qiluvchi' })
      .expect(200);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order.status).toBe('DELIVERED');
  });

  it('`FAILED` buyurtmaga TEGMAYDI — qaror ODAMNIKI', async () => {
    const { orderId, delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);
    await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'PICKED_UP' })
      .expect(200);

    const before = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'FAILED', failureReason: 'Mijoz joyida yo‘q' })
      .expect(200);

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    /*
      Yetkazilmagan buyurtma bilan nima qilish — ODAM qarori
      (qayta urinish, bekor qilish, manzilni o'zgartirish). Tizim
      ularning birortasini o'zi tanlay olmaydi.
    */
    expect(after.status).toBe(before.status);
  });

  it('`FAILED` uchun SABAB SHART', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'FAILED' })
      .expect(400);
  });

  // ===========================================================================
  // ASOSIY DA'VO: HAYDOVCHI FAQAT O'Z ISHIGA TEGADI
  // ===========================================================================

  it('haydovchi BOSHQA haydovchining yetkazmasini `404` ko‘radi', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    /*
      `403` EMAS: u "bunday yetkazma BOR, lekin sizga emas" degani
      va shu bilan id larni sinab ko'rib, qaysi yetkazmalar
      borligini aniqlash mumkin bo'lardi
      (`docs/DELIVERY-POLICY.md` §4).
    */
    await as('DRIVER2', 'get', `/delivery/my/${delivery.id}`).expect(404);
  });

  it('haydovchi BOSHQANING yetkazmasini o‘zgartira OLMAYDI', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    await as('DRIVER2', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'PICKED_UP' })
      .expect(404);

    // VA holat haqiqatan o'zgarmagan.
    const row = await prisma.delivery.findUniqueOrThrow({
      where: { id: delivery.id },
      select: { status: true },
    });
    expect(row.status).toBe('ASSIGNED');
  });

  it('haydovchi ro‘yxatida FAQAT o‘z ishi bor', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    const mine = await as('DRIVER', 'get', '/delivery/my/assignments').expect(200);
    const other = await as('DRIVER2', 'get', '/delivery/my/assignments').expect(200);

    const mineIds = (mine.body as { id: string }[]).map((d) => d.id);
    const otherIds = (other.body as { id: string }[]).map((d) => d.id);

    expect(mineIds).toContain(delivery.id);
    expect(otherIds).not.toContain(delivery.id);
  });

  it('haydovchi O‘ZIGA ish biriktira OLMAYDI', async () => {
    const { delivery } = await makeReadyOrder();

    await as('DRIVER', 'patch', `/delivery/${delivery.id}/assign`).send({ driverId }).expect(403);
  });

  it('haydovchi yetkazmani BEKOR QILA olmaydi — logist vakolati', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);

    const response = await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'CANCELLED' })
      .expect(403);

    expect(response.body.code).toBe('DELIVERY_DRIVER_FORBIDDEN');
  });

  it('haydovchi hamma yetkazmalar ro‘yxatini ko‘ra olmaydi', async () => {
    await as('DRIVER', 'get', '/delivery/assignments').expect(403);
  });

  // ===========================================================================
  // O'TISHLAR VA HODISALAR
  // ===========================================================================

  it('ruxsat etilmagan o‘tish RAD ETILADI', async () => {
    const { delivery } = await makeReadyOrder();

    // `CREATED` dan to'g'ridan-to'g'ri `DELIVERED` ga sakrash mumkin emas.
    const response = await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/status`)
      .send({ status: 'DELIVERED' })
      .expect(409);

    expect(response.body.code).toBe('DELIVERY_INVALID_TRANSITION');
  });

  it('HAR BIR o‘tish hodisa sifatida yoziladi', async () => {
    const { delivery } = await makeReadyOrder();
    await as('LOGISTICS', 'patch', `/delivery/${delivery.id}/assign`)
      .send({ driverId })
      .expect(200);
    await as('DRIVER', 'patch', `/delivery/my/${delivery.id}/status`)
      .send({ status: 'PICKED_UP' })
      .expect(200);

    const events = await prisma.deliveryEvent.findMany({
      where: { deliveryId: delivery.id },
      orderBy: { createdAt: 'asc' },
      select: { fromStatus: true, toStatus: true, actorId: true },
    });

    expect(events.map((e) => e.toStatus)).toEqual(['CREATED', 'ASSIGNED', 'PICKED_UP']);
    expect(events[1]?.fromStatus).toBe('CREATED');
    // Aktyor yozilgan — kim qilgani noma'lum qolmaydi.
    expect(events[2]?.actorId).not.toBeNull();
  });

  // ===========================================================================
  // PARK
  // ===========================================================================

  it('HAYDOVCHI roli yo‘q foydalanuvchiga profil ochib bo‘lmaydi', async () => {
    const outsider = await prisma.user.findFirstOrThrow({
      where: { email: STAFF.LOGISTICS.email },
      select: { id: true },
    });

    const response = await as('ADMIN', 'post', '/delivery/drivers')
      .send({ userId: outsider.id })
      .expect(400);

    expect(response.body.code).toBe('DRIVER_ROLE_MISSING');
  });

  it('davlat raqami TAKRORLANMAYDI', async () => {
    const existing = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { plateNumber: true },
    });

    const response = await as('ADMIN', 'post', '/delivery/vehicles')
      .send({ plateNumber: existing.plateNumber })
      .expect(409);

    expect(response.body.code).toBe('VEHICLE_PLATE_EXISTS');
  });

  it('autentifikatsiyasiz kirib bo‘lmaydi', async () => {
    await request(app.getHttpServer()).get(`${base}/delivery/assignments`).expect(401);
    await request(app.getHttpServer()).get(`${base}/delivery/my/assignments`).expect(401);
  });
});
