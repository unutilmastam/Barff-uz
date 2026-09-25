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
const SLUG = `e2e-order-${STAMP}`;
const ADMIN = { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Order-Parol-2026' };
const DEALER = { email: `${SLUG}-dealer@barff.uz`, password: 'Diler-Order-Parol-2026' };

const L = (text: string) => ({ uz: text, ru: text, en: text });
const BASE_PRICE = 100_000;

/**
 * Buyurtmalar (S26).
 *
 * UCHTA DoD DA'VOSI tekshiriladi (`ROADMAP.md` S26):
 *   1. ruxsat etilmagan o'tish `409` bilan rad etiladi;
 *   2. BIR VAQTDA ikki marta yuborish BITTA buyurtma yaratadi;
 *   3. HAR BIR o'tish tarixga yoziladi.
 */
describe('Orders (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let dealerToken = '';
  let dealerId = '';
  let addressId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const asDealer = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${dealerToken}`);

  const asAdmin = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

  /** Savatga bitta pozitsiya qo'yadi. */
  const fillCart = async (quantity = 5) => {
    await asDealer('delete', '/dealer/cart').expect(200);
    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity }).expect(201);
  };

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
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        fullName: 'E2E Order Admin',
        passwordHash: await passwords.hash(ADMIN.password),
        roles: { create: { roleId: role.id } },
      },
    });
    adminToken = await login(ADMIN.email, ADMIN.password);

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E buyurtma kategoriya') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-ORD-${STAMP}`,
        categoryId,
        name: L('E2E buyurtma mahsuloti'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-ORD-V-${STAMP}`, volumeMl: 1000 },
    });
    variantId = variant.id;

    await prisma.productPrice.create({
      data: { variantId, amount: BASE_PRICE, currency: 'UZS' },
    });

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        region: 'Toshkent',
        businessType: 'DISTRIBUTOR',
        contactName: 'Buyurtma Diler',
        phone: `+99897${String(1_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        ...DEALER,
      })
      .expect(202);

    const dealer = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG} MChJ` },
      select: { id: true },
    });
    dealerId = dealer.id;

    await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    dealerToken = await login(DEALER.email, DEALER.password);

    const address = await asDealer('post', '/dealer/addresses')
      .send({
        label: 'Asosiy ombor',
        region: 'Toshkent',
        district: 'Chilonzor',
        street: 'Bunyodkor 1',
        contactName: 'Qabul qiluvchi',
        contactPhone: '+998901234567',
        notes: '2-qavat',
      })
      .expect(201);

    addressId = address.body.id as string;

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

    /*
      YETKAZMA AVVAL — `Delivery.orderId` da `onDelete: Restrict`.

      Bu ATAYLAB: yetkazmasi bor buyurtmani o'chirib bo'lmaydi,
      aks holda tovar qayerga ketgani yo'qolardi. Tozalash tartibi
      shuni hisobga olishi kerak (S32 da o'lchab aniqlandi).
    */
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
    await prisma.productPrice.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { entity: { in: ['order', 'dealer'] } } });
    await prisma.notification.deleteMany({
      where: { event: { in: ['order.created', 'dealer.registered', 'dealer.status.changed'] } },
    });

    if (dealer !== null) {
      await prisma.refreshToken.deleteMany({ where: { userId: dealer.userId } });
      await prisma.refreshTokenFamily.deleteMany({ where: { userId: dealer.userId } });
      await prisma.userRole.deleteMany({ where: { userId: dealer.userId } });
      await prisma.user.deleteMany({ where: { id: dealer.userId } });
    }
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });

    await prisma.$disconnect();
    await app?.close();
  });

  // ===========================================================================
  // YUBORISH
  // ===========================================================================

  describe('yuborish', () => {
    it('savatdan buyurtma yaratadi va NARXNI MUZLATADI', async () => {
      await fillCart(5);

      const response = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      expect(response.body.number).toMatch(/^BRF-\d{4}-\d{6}$/);
      expect(response.body.status).toBe('PENDING_REVIEW');
      expect(response.body.total).toBe(BASE_PRICE * 5);

      const items = await prisma.orderItem.findMany({ where: { orderId: response.body.id } });
      expect(items).toHaveLength(1);
      expect(items[0]?.unitPrice).toBe(BASE_PRICE);
      // Mahsulot nomi ham NUSXA sifatida saqlanadi.
      expect(items[0]?.sku).toBe(`E2E-ORD-V-${STAMP}`);
    });

    it('yuborilgandan keyin SAVAT bo‘shaydi', async () => {
      const cart = await asDealer('get', '/dealer/cart').expect(200);

      expect(cart.body.lines).toEqual([]);
    });

    /**
     * NARX MUZLATILGANINING ASOSIY DALILI.
     */
    it('narx keyin o‘zgarsa ham BUYURTMADAGI summa o‘zgarmaydi', async () => {
      await fillCart(4);

      const order = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
      const frozen = order.body.total as number;

      // Narxni 50% ga tushiramiz.
      await asAdmin('post', '/admin/price-rules')
        .send({
          name: 'Muzlatish sinovi',
          kind: 'PERCENT_DISCOUNT',
          amount: 5000,
          productId,
        })
        .expect(201);

      const after = await asDealer('get', `/dealer/orders/${order.body.id}`).expect(200);

      expect(after.body.total).toBe(frozen);
      expect(after.body.items[0].unitPrice).toBe(BASE_PRICE);

      await prisma.priceRule.deleteMany({ where: { name: 'Muzlatish sinovi' } });
    });

    it('bo‘sh savatdan buyurtma bermaydi', async () => {
      await asDealer('delete', '/dealer/cart').expect(200);

      const response = await asDealer('post', '/dealer/orders').send({ addressId }).expect(400);
      expect(response.body.code).toBe('CART_EMPTY');
    });

    it('BEGONA manzil bilan buyurtma bermaydi', async () => {
      await fillCart(2);

      await asDealer('post', '/dealer/orders')
        .send({ addressId: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b' })
        .expect(404);
    });

    it('ENG KAM MIQDOR yuborishda MAJBURIY', async () => {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { minOrderQuantity: 10 },
      });

      await fillCart(3);

      const response = await asDealer('post', '/dealer/orders').send({ addressId }).expect(400);
      expect(response.body.code).toBe('ORDER_BELOW_MINIMUM');

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { minOrderQuantity: null },
      });
    });

    it('manzil NUSXA sifatida saqlanadi — manzil o‘chsa ham qoladi', async () => {
      await fillCart(2);

      const order = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      expect(order.body.shippingLabel).toBe('Asosiy ombor');
      expect(order.body.shippingAddress).toContain('Bunyodkor 1');
      expect(order.body.shippingNotes).toBe('2-qavat');
    });
  });

  // ===========================================================================
  // DoD 2: BIR VAQTDA IKKI MARTA YUBORISH
  // ===========================================================================

  describe('takroriy yuborish', () => {
    it('bir xil kalit bilan IKKINCHI so‘rov YANGI buyurtma yaratmaydi', async () => {
      await fillCart(3);

      const key = `e2e-key-${STAMP}-ketma-ket`;

      const first = await asDealer('post', '/dealer/orders')
        .send({ addressId, idempotencyKey: key })
        .expect(201);

      const second = await asDealer('post', '/dealer/orders')
        .send({ addressId, idempotencyKey: key })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.duplicate).toBe(true);

      const count = await prisma.order.count({ where: { dealerId, idempotencyKey: key } });
      expect(count).toBe(1);
    });

    /**
     * BIR VAQTDA — ketma-ket EMAS.
     *
     * Ketma-ket so'rov oson: birinchisi tugagach ikkinchisi mavjud
     * yozuvni topadi. BIR VAQTDA yuborilganda esa ikkalasi ham
     * "yo'q" deb ko'radi va ikkalasi ham yaratmoqchi bo'ladi —
     * bunda faqat BAZADAGI yagona indeks saqlaydi.
     *
     * Shuning uchun test aynan shu holatni yaratadi.
     */
    it('BIR VAQTDA yuborilgan ikki so‘rov BITTA buyurtma beradi', async () => {
      await fillCart(7);

      const key = `e2e-key-${STAMP}-bir-vaqtda`;

      const submit = () =>
        asDealer('post', '/dealer/orders').send({ addressId, idempotencyKey: key });

      const [a, b] = await Promise.all([submit(), submit()]);

      // BAZADA bitta buyurtma.
      const count = await prisma.order.count({ where: { dealerId, idempotencyKey: key } });
      expect(count).toBe(1);

      /*
        VA IKKALA SO'ROV HAM TO'G'RI JAVOB OLADI.

        Birinchi versiyada poygada yutqazgan so'rov `500` olardi:
        yagona indeks xatosi yuqoriga chiqib ketardi. Buyurtma
        yaratilgan bo'lsa ham diler "Internal Server Error" ko'rardi
        — va aynan shu uni QAYTA yuborishga undardi.

        Shuning uchun test "kamida bittasi o'tdi" bilan
        KIFOYALANMAYDI: ikkalasi ham `201` bo'lishi va BIR XIL
        buyurtmani ko'rsatishi shart.
      */
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.id).toBe(b.body.id);

      // Bittasi yaratdi, ikkinchisi mavjudini qaytardi.
      expect([a.body.duplicate, b.body.duplicate].filter(Boolean)).toHaveLength(1);
    });

    it('kalitsiz yuborilgan ikki buyurtma ALOHIDA qoladi', async () => {
      // Kalit ixtiyoriy: berilmasa har yuborish yangi buyurtma.
      await fillCart(2);
      const first = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      await fillCart(2);
      const second = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      expect(second.body.id).not.toBe(first.body.id);
    });
  });

  // ===========================================================================
  // DoD 1 va 3: O'TISHLAR VA TARIX
  // ===========================================================================

  describe('holat mashinasi', () => {
    let orderId = '';

    beforeAll(async () => {
      await fillCart(2);
      const order = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
      orderId = order.body.id as string;
    });

    it('RUXSAT ETILMAGAN o‘tish 409 beradi', async () => {
      // PENDING_REVIEW -> DELIVERED jadvalda yo'q.
      const response = await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'DELIVERED' })
        .expect(409);

      expect(response.body.code).toBe('ORDER_STATUS_INVALID_TRANSITION');
    });

    it('bosqichni TASHLAB ketib bo‘lmaydi', async () => {
      await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'PICKING' })
        .expect(409);
    });

    it('TO‘G‘RI ketma-ketlik o‘tadi va HAR BIRI tarixga yoziladi', async () => {
      const path = ['CONFIRMED', 'RESERVED', 'PICKING', 'PACKED', 'READY_FOR_DELIVERY'] as const;

      for (const status of path) {
        await asAdmin('patch', `/admin/orders/${orderId}/status`).send({ status }).expect(200);
      }

      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' },
      });

      // Yaratilish + beshta o'tish.
      expect(history.map((h) => h.toStatus)).toEqual(['PENDING_REVIEW', ...path]);

      // Har bir yozuvda OLDINGI holat ham bor.
      expect(history[1]?.fromStatus).toBe('PENDING_REVIEW');
      expect(history[2]?.fromStatus).toBe('CONFIRMED');
    });

    it('o‘tish AUDIT jurnaliga ham tushadi', async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { entity: 'order', entityId: orderId, action: 'order.status.changed' },
        orderBy: { createdAt: 'desc' },
      });

      expect(entry).not.toBeNull();
      expect(entry?.actorEmail).toBe(ADMIN.email);
    });

    it('YAKUNIY holatdan keyin o‘tish yo‘q', async () => {
      await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'DRIVER_ASSIGNED' })
        .expect(200);
      await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'IN_TRANSIT' })
        .expect(200);
      await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'DELIVERED' })
        .expect(200);

      // DELIVERED — yakuniy.
      await asAdmin('patch', `/admin/orders/${orderId}/status`)
        .send({ status: 'CANCELLED' })
        .expect(409);
    });
  });

  // ===========================================================================
  // BEKOR QILISH
  // ===========================================================================

  describe('bekor qilish', () => {
    it('diler KO‘RIB CHIQILMAGAN buyurtmani bekor qila oladi', async () => {
      await fillCart(2);
      const order = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      const response = await asDealer('post', `/dealer/orders/${order.body.id}/cancel`).expect(201);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('TASDIQLANGAN buyurtmani diler bekor QILA OLMAYDI', async () => {
      await fillCart(2);
      const order = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

      await asAdmin('patch', `/admin/orders/${order.body.id}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const response = await asDealer('post', `/dealer/orders/${order.body.id}/cancel`).expect(409);
      expect(response.body.code).toBe('ORDER_CANCEL_NOT_ALLOWED');
    });
  });

  // ===========================================================================
  // BEGONA BUYURTMA
  // ===========================================================================

  it('BOSHQA dilerning buyurtmasi KO‘RINMAYDI', async () => {
    const creds = { email: `${SLUG}-other@barff.uz`, password: 'Diler-Other-Ord-2026' };

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG}-other MChJ`,
        region: 'Samarqand',
        businessType: 'RETAIL',
        contactName: 'Begona',
        phone: `+99893${String(2_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        ...creds,
      })
      .expect(202);

    const other = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG}-other MChJ` },
      select: { id: true, userId: true },
    });

    await asAdmin('patch', `/admin/dealers/${other.id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const otherToken = await login(creds.email, creds.password);

    const ourOrder = await prisma.order.findFirstOrThrow({
      where: { dealerId },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .get(`${base}/dealer/orders/${ourOrder.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get(`${base}/dealer/orders`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(list.body.items).toEqual([]);

    // Tozalash.
    await prisma.dealerEvent.deleteMany({ where: { dealerId: other.id } });
    await prisma.dealer.deleteMany({ where: { id: other.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: other.userId } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: other.userId } });
    await prisma.userRole.deleteMany({ where: { userId: other.userId } });
    await prisma.user.deleteMany({ where: { id: other.userId } });
  });

  it('buyurtma RAQAMLARI takrorlanmaydi', async () => {
    const orders = await prisma.order.findMany({ where: { dealerId }, select: { number: true } });
    const numbers = orders.map((o) => o.number);

    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
