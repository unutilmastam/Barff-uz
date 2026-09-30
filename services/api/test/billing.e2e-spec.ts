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
const SLUG = `e2e-bill-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Bill-Admin-2026' },
  WAREHOUSE: { email: `${SLUG}-wh@barff.uz`, password: 'E2E-Bill-Wh-2026' },
} as const;

/**
 * Moliya: hisob-faktura, to'lov, balans (S36).
 *
 * DA'VOLAR (S36 DoD):
 *
 * 1. Pul BUTUN SONDA, tiyinda — kasr summa RAD ETILADI.
 * 2. Balans HISOBLANADI va yarashadi: to'liq to'langan hujjat ham
 *    hisobga kiradi.
 * 3. Har bir moliyaviy o'zgarish AUDIT jurnaliga tushadi.
 *
 * Va siyosatning o'zi (`docs/BILLING-POLICY.md`):
 * - hisob-faktura faqat YETKAZILGAN buyurtmadan;
 * - holat TAQSIMOTDAN kelib chiqadi, qo'lda qo'yilmaydi;
 * - ortiqcha to'lov zo'rlab yopishtirilmaydi;
 * - kredit limiti buyurtmani BLOKLAYDI, lekin sozlanmagan bo'lsa
 *   tekshirilmaydi.
 */
describe('Billing (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let dealerToken = '';
  let dealerId = '';
  let addressId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let warehouseId = '';

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const as = (
    role: keyof typeof STAFF,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);

  const asDealer = (method: 'get' | 'post', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${dealerToken}`);

  /** Buyurtmani `DELIVERED` gacha olib boradi — hisob-faktura shundan beriladi. */
  const makeDeliveredOrder = async (quantity = 2) => {
    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity }).expect(201);
    const created = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
    const orderId = created.body.id as string;

    for (const status of [
      'CONFIRMED',
      'RESERVED',
      'PICKING',
      'PACKED',
      'READY_FOR_DELIVERY',
      'DRIVER_ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
    ]) {
      await as('ADMIN', 'patch', `/admin/orders/${orderId}/status`).send({ status }).expect(200);
    }

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { id: true, number: true, total: true },
    });

    return order;
  };

  /**
   * Dilerning HAMMA qarzini yopadi.
   *
   * AVTOMATIK TAQSIMOTNI SINAYDIGAN TESTLAR shuni talab qiladi.
   * Ular "boshqa ochiq hisob-faktura yo'q" deb o'ylab yozilgan
   * edi va TARTIBGA BOG'LIQ bo'lib yiqildi: oldingi testlardan
   * qolgan ochiq hujjatlar to'lovni o'ziga olib ketdi.
   *
   * Aybdor kod emas, testning O'ZI edi — avtomatik taqsimot
   * aynan shunday ishlashi KERAK (eskisidan boshlab).
   */
  const settleAll = async () => {
    const balance = await as('ADMIN', 'get', `/billing/dealers/${dealerId}/balance`).expect(200);
    const outstanding = balance.body.outstanding as number;

    if (outstanding <= 0) return;

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: outstanding,
        method: 'OFFSET',
        receivedAt: new Date().toISOString(),
        note: 'E2E: qarzni yopish',
      })
      .expect(201);
  };

  /** Hisob-faktura yaratadi va BERADI. */
  const issuedInvoice = async (quantity = 2) => {
    const order = await makeDeliveredOrder(quantity);

    const created = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: order.id })
      .expect(201);

    const issued = await as('ADMIN', 'post', `/billing/invoices/${created.body.id}/issue`).expect(
      201,
    );

    return { order, invoice: issued.body };
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
      const role = await prisma.role.findUniqueOrThrow({ where: { code: key } });

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
      data: { slug: `${SLUG}-kat`, name: L('E2E moliya kat') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-BILL-${STAMP}`,
        categoryId,
        name: L('E2E mahsulot'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-BILL-V-${STAMP}`, volumeMl: 1000 },
    });
    variantId = variant.id;

    /* Narx 50 000 tiyin = 500 so'm. Butun son — kasr summa taqiqlangan. */
    await prisma.productPrice.create({ data: { variantId, amount: 50_000, currency: 'UZS' } });

    const warehouse = await as('ADMIN', 'post', '/warehouse/warehouses')
      .send({
        code: `E2EBILL-${String(STAMP).slice(-6)}`,
        name: 'E2E moliya ombori',
        region: 'Toshkent',
        isDefault: false,
      })
      .expect(201);
    warehouseId = warehouse.body.id as string;

    await as('ADMIN', 'post', '/warehouse/movements')
      .send({
        warehouseId,
        productVariantId: variantId,
        type: 'IN',
        quantity: 10_000,
        reason: 'E2E boshlangich qoldiq',
      })
      .expect(201);

    // Diler: ariza -> tasdiqlash -> kirish.
    const dealerEmail = `${SLUG}-dealer@barff.uz`;
    const dealerPassword = 'E2E-Bill-Dealer-2026';

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        taxId: String(STAMP).slice(-9),
        region: 'Toshkent',
        businessType: 'RETAIL',
        contactName: 'E2E Kontakt',
        phone: `+99890${String(STAMP).slice(-7)}`,
        email: dealerEmail,
        password: dealerPassword,
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

    dealerToken = await login(dealerEmail, dealerPassword);

    const address = await asDealer('post', '/dealer/addresses')
      .send({
        label: 'E2E manzil',
        region: 'Toshkent',
        street: 'Sinov 1',
        contactName: 'E2E Qabul',
        contactPhone: `+99891${String(STAMP).slice(-7)}`,
        isDefault: true,
      })
      .expect(201);
    addressId = address.body.id as string;
  }, 90_000);

  afterAll(async () => {
    if (dealerId === '') return;

    const orders = await prisma.order.findMany({ where: { dealerId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    await prisma.paymentAllocation.deleteMany({ where: { payment: { dealerId } } });
    await prisma.payment.deleteMany({ where: { dealerId } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { dealerId } } });
    await prisma.invoice.deleteMany({ where: { dealerId } });

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
    await prisma.auditLog.deleteMany({ where: { entity: { in: ['invoice', 'payment'] } } });

    const emails = [...Object.values(STAFF).map((s) => s.email), `${SLUG}-dealer@barff.uz`];
    const ids = [...(dealer !== null ? [dealer.userId] : [])];
    await prisma.userRole.deleteMany({
      where: { OR: [{ user: { email: { in: emails } } }, { userId: { in: ids } }] },
    });
    await prisma.user.deleteMany({
      where: { OR: [{ email: { in: emails } }, { id: { in: ids } }] },
    });

    await app.close();
    await prisma.$disconnect();
  }, 60_000);

  // ===========================================================================
  // HISOB-FAKTURA QAYERDAN KELADI
  // ===========================================================================

  /**
   * HISOB-FAKTURA FAQAT YETKAZILGAN BUYURTMADAN.
   *
   * Yo'ldagi buyurtmaga hujjat berilsa va yetkazish bajarilmasa,
   * dilerda to'lanishi kerak bo'lmagan hujjat qolardi.
   */
  it('yetkazilmagan buyurtmadan hisob-faktura berilmaydi', async () => {
    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity: 1 }).expect(201);
    const created = await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);

    const response = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: created.body.id })
      .expect(409);

    expect(response.body.code).toBe('ORDER_NOT_INVOICEABLE');
  });

  it('bitta buyurtmaga IKKITA hisob-faktura berilmaydi', async () => {
    const order = await makeDeliveredOrder();

    await as('ADMIN', 'post', '/billing/invoices').send({ orderId: order.id }).expect(201);

    const second = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: order.id })
      .expect(409);

    expect(second.body.code).toBe('INVOICE_EXISTS');
  });

  it('pozitsiyalar NUSXA olinadi va summa buyurtmaga TENG', async () => {
    const order = await makeDeliveredOrder(3);

    const invoice = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: order.id })
      .expect(201);

    expect(invoice.body.total).toBe(order.total);
    expect(invoice.body.items).toHaveLength(1);
    expect(invoice.body.items[0].quantity).toBe(3);
    // Soliq HOZIRCHA 0 va u hisoblanmaydi (Q17).
    expect(invoice.body.taxAmount).toBe(0);
    expect(invoice.body.number).toMatch(/^INV-\d{4}-\d{6}$/);
  });

  /** Berilgan hujjatni qoralamaga qaytarish — dilerdagi qog'ozdan ajralish. */
  it('BERILGAN hujjat qayta berilmaydi', async () => {
    const { invoice } = await issuedInvoice();

    const again = await as('ADMIN', 'post', `/billing/invoices/${invoice.id}/issue`).expect(409);

    expect(again.body.code).toBe('INVOICE_TRANSITION_FORBIDDEN');
  });

  // ===========================================================================
  // TO'LOV VA HOLAT
  // ===========================================================================

  /**
   * HOLAT TAQSIMOTDAN KELIB CHIQADI.
   *
   * Uni qo'lda qo'yish imkoni bo'lsa, "to'landi" deb belgilangan,
   * lekin pul kelmagan hisob-faktura paydo bo'lardi.
   */
  it('qisman tolov — QISMAN TOLANGAN, toliq tolov — TOLANGAN', async () => {
    const { invoice } = await issuedInvoice();
    const half = Math.floor(invoice.total / 2);

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: half,
        method: 'BANK_TRANSFER',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: half }],
      })
      .expect(201);

    const partial = await as('ADMIN', 'get', `/billing/invoices/${invoice.id}`).expect(200);
    expect(partial.body.status).toBe('PARTIALLY_PAID');
    expect(partial.body.outstanding).toBe(invoice.total - half);

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: invoice.total - half,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: invoice.total - half }],
      })
      .expect(201);

    const paid = await as('ADMIN', 'get', `/billing/invoices/${invoice.id}`).expect(200);
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.outstanding).toBe(0);
  });

  /**
   * AVTOMATIK TAQSIMOT — ESKISIDAN BOSHLAB.
   *
   * Buxgalteriyada odatiy tartib; u muddati o'tgan hujjatni
   * birinchi yopadi.
   */
  it('avtomatik taqsimot ESKISIDAN boshlanadi', async () => {
    await settleAll();

    const first = await issuedInvoice(1);
    const second = await issuedInvoice(1);

    // Ikkinchisiga yetmaydigan summa: birinchisi TO'LIQ yopilsin.
    const amount = first.invoice.total + 1;

    const payment = await as('ADMIN', 'post', '/billing/payments')
      .send({ dealerId, amount, method: 'CASH', receivedAt: new Date().toISOString() })
      .expect(201);

    const allocations = payment.body.allocations as { amount: number; invoice: { id: string } }[];
    const toFirst = allocations.find((row) => row.invoice.id === first.invoice.id);
    const toSecond = allocations.find((row) => row.invoice.id === second.invoice.id);

    expect(toFirst?.amount).toBe(first.invoice.total);
    expect(toSecond?.amount).toBe(1);
  });

  /**
   * ORTIQCHA TO'LOV ZO'RLAB YOPISHTIRILMAYDI.
   *
   * Uni biror hujjatga yopishtirish "110% to'langan hisob-faktura"
   * degan ma'nosiz yozuv yaratardi. Ortiqcha summa dilerning
   * foydasiga balansda turadi.
   */
  it('ortiqcha tolov TAQSIMLANMAY qoladi', async () => {
    await settleAll();

    const { invoice } = await issuedInvoice(1);
    const extra = 123_456;

    const payment = await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: invoice.total + extra,
        method: 'BANK_TRANSFER',
        receivedAt: new Date().toISOString(),
      })
      .expect(201);

    expect(payment.body.unallocated).toBe(extra);
  });

  it('taqsimot tolov summasidan OSHMAYDI', async () => {
    const { invoice } = await issuedInvoice(1);

    const response = await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: 1_000,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: 2_000 }],
      })
      .expect(400);

    expect(response.body.code).toBe('ALLOCATION_EXCEEDS_PAYMENT');
  });

  /**
   * QAYTA TAQSIMLASH — ALMASHTIRISH, QO'SHISH EMAS.
   *
   * Qo'shish bo'lsa, ikki marta yuborilgan so'rov summani ikki
   * barobar qilardi.
   */
  it('qayta taqsimlash eskisini ALMASHTIRADI', async () => {
    const one = await issuedInvoice(1);
    const two = await issuedInvoice(1);

    const payment = await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: one.invoice.total,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: one.invoice.id, amount: one.invoice.total }],
      })
      .expect(201);

    const reallocated = await as('ADMIN', 'put', `/billing/payments/${payment.body.id}/allocations`)
      .send({ allocations: [{ invoiceId: two.invoice.id, amount: one.invoice.total }] })
      .expect(200);

    expect(reallocated.body.allocations).toHaveLength(1);
    expect(reallocated.body.allocations[0].invoice.id).toBe(two.invoice.id);

    /*
      ESKI HUJJAT HAM YANGILANADI.

      Taqsimot olib tashlangan hujjat "to'landi" bo'lib qolsa,
      balans to'g'ri, ro'yxat esa yolg'on ko'rsatardi.
    */
    const first = await as('ADMIN', 'get', `/billing/invoices/${one.invoice.id}`).expect(200);
    expect(first.body.status).toBe('ISSUED');
    expect(first.body.outstanding).toBe(one.invoice.total);
  });

  it('bekor qilingan hujjatga tolov taqsimlanmaydi', async () => {
    const { invoice } = await issuedInvoice(1);

    await as('ADMIN', 'post', `/billing/invoices/${invoice.id}/cancel`)
      .send({ reason: 'E2E sinovi' })
      .expect(201);

    const response = await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: 1_000,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: 1_000 }],
      })
      .expect(400);

    expect(response.body.code).toBe('INVOICE_NOT_OPEN');
  });

  /**
   * TAQSIMLANGAN TO'LOVI BOR HUJJAT BEKOR QILINMAYDI.
   *
   * Aks holda pul "hech qaysi hisob-fakturaga tegishli emas"
   * holatga tushib qolardi.
   */
  it('taqsimlangan tolovi bor hujjat BEKOR QILINMAYDI', async () => {
    const { invoice } = await issuedInvoice(1);

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: 1_000,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: 1_000 }],
      })
      .expect(201);

    const response = await as('ADMIN', 'post', `/billing/invoices/${invoice.id}/cancel`)
      .send({ reason: 'E2E sinovi' })
      .expect(409);

    expect(response.body.code).toBe('INVOICE_HAS_ALLOCATIONS');
  });

  it('bekor qilishda SABAB shart', async () => {
    const { invoice } = await issuedInvoice(1);

    await as('ADMIN', 'post', `/billing/invoices/${invoice.id}/cancel`).send({}).expect(400);
    await as('ADMIN', 'post', `/billing/invoices/${invoice.id}/cancel`)
      .send({ reason: 'ha' })
      .expect(400);
  });

  // ===========================================================================
  // PUL BUTUN SONDA
  // ===========================================================================

  /**
   * KASR SUMMA RAD ETILADI (S36 DoD).
   *
   * `0.1 + 0.2 !== 0.3` — kasr bilan hisoblangan balansda xato
   * to'planadi va u HECH QAYERDA ko'rinmaydi.
   */
  it('kasr summali tolov RAD ETILADI', async () => {
    const response = await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: 1_000.5,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('nol va manfiy tolov RAD ETILADI', async () => {
    for (const amount of [0, -1000]) {
      await as('ADMIN', 'post', '/billing/payments')
        .send({ dealerId, amount, method: 'CASH', receivedAt: new Date().toISOString() })
        .expect(400);
    }
  });

  // ===========================================================================
  // BALANS
  // ===========================================================================

  /**
   * BALANS YARASHADI.
   *
   * Bu yerda men deyarli xato qilgandim: balans faqat OCHIQ
   * hujjatlarni qo'shardi, to'lovlarni esa HAMMASINI. To'liq
   * to'langan hujjat `PAID` bo'lib ro'yxatdan chiqardi, uning
   * to'lovi qolardi — va qarz MANFIY ko'rinardi.
   */
  it('balans TOLANGAN hujjatlarni ham hisobga oladi', async () => {
    const before = await as('ADMIN', 'get', `/billing/dealers/${dealerId}/balance`).expect(200);

    const { invoice } = await issuedInvoice(1);

    const afterInvoice = await as('ADMIN', 'get', `/billing/dealers/${dealerId}/balance`).expect(
      200,
    );
    expect(afterInvoice.body.outstanding).toBe(before.body.outstanding + invoice.total);

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: invoice.total,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: invoice.total }],
      })
      .expect(201);

    const paid = await as('ADMIN', 'get', `/billing/invoices/${invoice.id}`).expect(200);
    expect(paid.body.status).toBe('PAID');

    const afterPayment = await as('ADMIN', 'get', `/billing/dealers/${dealerId}/balance`).expect(
      200,
    );

    // Qarz BOSHLANG'ICH holatga qaytadi — manfiyga TUSHMAYDI.
    expect(afterPayment.body.outstanding).toBe(before.body.outstanding);
  });

  // ===========================================================================
  // KREDIT LIMITI
  // ===========================================================================

  /**
   * LIMIT SOZLANMAGAN BO'LSA TEKSHIRILMAYDI.
   *
   * `null` ni "kredit yo'q" deb o'qish bugungi HAMMA dilerni
   * bloklab qo'yardi (`docs/BILLING-POLICY.md` §4).
   */
  it('limit sozlanmagan bolsa buyurtma OTADI', async () => {
    await as('ADMIN', 'put', `/billing/dealers/${dealerId}/credit-limit`)
      .send({ creditLimit: null })
      .expect(200);

    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity: 1 }).expect(201);
    await asDealer('post', '/dealer/orders').send({ addressId }).expect(201);
  });

  it('limitdan oshgan buyurtma BLOKLANADI', async () => {
    // Limitni bir tiyinga qo'yamiz: har qanday buyurtma oshadi.
    await as('ADMIN', 'put', `/billing/dealers/${dealerId}/credit-limit`)
      .send({ creditLimit: 1 })
      .expect(200);

    await asDealer('post', '/dealer/cart/items').send({ variantId, quantity: 1 }).expect(201);

    const response = await asDealer('post', '/dealer/orders').send({ addressId }).expect(400);

    expect(response.body.code).toBe('CREDIT_LIMIT_EXCEEDED');
    // Xabar RAQAM bilan: logist yoki diler nima qilish kerakligini bilsin.
    expect(response.body.message).toMatch(/limit/i);

    // Tozalaymiz — keyingi sinovlarga xalaqit bermasin.
    await as('ADMIN', 'put', `/billing/dealers/${dealerId}/credit-limit`)
      .send({ creditLimit: null })
      .expect(200);
  });

  // ===========================================================================
  // DILER FAQAT O'ZINIKINI KO'RADI
  // ===========================================================================

  it('QORALAMA hisob-faktura dilerga KORSATILMAYDI', async () => {
    const order = await makeDeliveredOrder(1);
    const draft = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: order.id })
      .expect(201);

    expect(draft.body.status).toBe('DRAFT');

    // Ro'yxatda yo'q.
    const list = await asDealer('get', '/dealer/invoices?limit=60').expect(200);
    const numbers = (list.body.items as { number: string }[]).map((row) => row.number);
    expect(numbers).not.toContain(draft.body.number);

    // To'g'ridan-to'g'ri ham `404` — `403` EMAS.
    await asDealer('get', `/dealer/invoices/${draft.body.id}`).expect(404);
  });

  it('diler OZ hisob-fakturasini koradi', async () => {
    const { invoice } = await issuedInvoice(1);

    const detail = await asDealer('get', `/dealer/invoices/${invoice.id}`).expect(200);
    expect(detail.body.number).toBe(invoice.number);
    // Ichki izoh dilerga ham keladi — u BO'SH bo'lishi kerak.
    expect(detail.body.internalNote ?? null).toBeNull();
  });

  it('diler OZ balansini koradi', async () => {
    const balance = await asDealer('get', '/dealer/balance').expect(200);

    expect(typeof balance.body.outstanding).toBe('number');
    expect(balance.body.dealer.id).toBe(dealerId);
  });

  // ===========================================================================
  // AUDIT
  // ===========================================================================

  /** Har bir moliyaviy o'zgarish jurnalga tushadi (CLAUDE.md §23). */
  it('hisob-faktura va tolov AUDIT jurnaliga tushadi', async () => {
    const { invoice } = await issuedInvoice(1);

    await as('ADMIN', 'post', '/billing/payments')
      .send({
        dealerId,
        amount: 1_000,
        method: 'CASH',
        receivedAt: new Date().toISOString(),
        allocations: [{ invoiceId: invoice.id, amount: 1_000 }],
      })
      .expect(201);

    const invoiceLogs = await prisma.auditLog.count({
      where: { entity: 'invoice', entityId: invoice.id },
    });
    const paymentLogs = await prisma.auditLog.count({ where: { entity: 'payment' } });

    // Yaratildi + berildi.
    expect(invoiceLogs).toBeGreaterThanOrEqual(2);
    expect(paymentLogs).toBeGreaterThanOrEqual(1);
  });

  // ===========================================================================
  // CSV EKSPORT
  // ===========================================================================

  /**
   * CSV — BUXGALTERIYA UCHUN, RASMIY HUJJAT EMAS.
   *
   * Summalar TIYINDA chiqadi: so'mga aylantirib yuborish kasr
   * ustun hosil qilardi va buxgalterning dasturi uni mahalliy
   * o'nlik ajratgichi bilan boshqacha o'qishi mumkin edi.
   */
  it('hisob-fakturalar CSV — sarlavha, BOM va TIYINDAGI summalar', async () => {
    const { invoice } = await issuedInvoice(1);

    const response = await as('ADMIN', 'get', '/billing/exports/invoices.csv').expect(200);

    expect(response.headers['content-type']).toContain('text/csv');

    const body = response.text;

    // BOM — usiz Excel o'zbekcha harflarni buzadi.
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('jami_tiyin');
    expect(body).toContain(invoice.number);
    // Summa TIYINDA: so'mga aylantirilmagan.
    expect(body).toContain(`"${invoice.total}"`);
  });

  /** QORALAMA eksportga TUSHMAYDI — u hali berilmagan hujjat. */
  it('QORALAMA hisob-faktura CSV ga tushmaydi', async () => {
    const order = await makeDeliveredOrder(1);
    const draft = await as('ADMIN', 'post', '/billing/invoices')
      .send({ orderId: order.id })
      .expect(201);

    const response = await as('ADMIN', 'get', '/billing/exports/invoices.csv').expect(200);

    expect(response.text).not.toContain(draft.body.number);
  });

  it('tolovlar CSV ishlaydi', async () => {
    const response = await as('ADMIN', 'get', '/billing/exports/payments.csv').expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('taqsimlanmagan_tiyin');
  });

  /**
   * CSV QO'SH TIRNOQNI EKRANLASHTIRADI.
   *
   * Kompaniya nomida tirnoq bo'lsa (haqiqatda uchraydi), ekranlashsiz
   * qator BUZILARDI va buxgalterning jadvali siljib ketardi.
   */
  it('CSV qosh tirnoqli nomni BUZMAYDI', async () => {
    const quoted = `${SLUG} "Tirnoq" MChJ`;
    await prisma.dealer.update({ where: { id: dealerId }, data: { companyName: quoted } });

    const response = await as('ADMIN', 'get', '/billing/exports/invoices.csv').expect(200);

    // Ichkaridagi tirnoq IKKILANTIRILADI.
    expect(response.text).toContain('""Tirnoq""');

    await prisma.dealer.update({
      where: { id: dealerId },
      data: { companyName: `${SLUG} MChJ` },
    });
  });

  it('autentifikatsiyasiz kirib bolmaydi', async () => {
    await request(app.getHttpServer()).get(`${base}/billing/invoices`).expect(401);
    await request(app.getHttpServer()).get(`${base}/billing/payments`).expect(401);
    await request(app.getHttpServer()).get(`${base}/dealer/balance`).expect(401);
  });
});
