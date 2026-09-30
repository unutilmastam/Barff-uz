import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { SALES_ORDER_STATUSES } from '@barff/types';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { ReportsService } from '../src/reports/reports.service';
import { unzip } from '../src/reports/export/xlsx.test';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const SLUG = `e2e-rep-${STAMP}`;
const L = (text: string) => ({ uz: text, ru: text, en: text });

/** Faqat shu testga tegishli hududlar — boshqa ma'lumot hisobotga aralashmaydi. */
const REG_T = `E2E-T-${STAMP}`;
const REG_S = `E2E-S-${STAMP}`;
const REG_L = `E2E-L-${STAMP}`;
const REG_BIG = `E2E-BIG-${STAMP}`;

/** Sanalar 2031 yilda — haqiqiy va boshqa testlar ma'lumotidan uzoqda. */
const WINDOW = { from: '2031-03-10', to: '2031-03-12' };

const STAFF = {
  ADMIN: { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Rep-Admin-2026' },
  SALES: { email: `${SLUG}-sales@barff.uz`, password: 'E2E-Rep-Sales-2026' },
} as const;

/** Toshkent kuni — `Intl` bilan, hisobotdagi SQL'dan MUSTAQIL. */
const tashkentDay = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

const at = (iso: string) => new Date(iso);

/**
 * Hisobotlar (S37).
 *
 * S37 DoD: "report numbers match source tables in a verification
 * test".
 *
 * HAR BIR HISOBOT ikki yo'l bilan hisoblanadi: API (SQL agregatsiya)
 * va bu yerda — manba jadvaldan qatorlarni o'qib, JavaScript'da
 * yig'ib. Ikkalasi mos kelsagina o'tadi. Bundan tashqari bir nechta
 * raqam QOLDA yozilgan: ikkala hisob bir xil xato qilsa ham
 * ushlanishi uchun.
 */
describe('Reports (e2e)', () => {
  let app: INestApplication;
  let reports: ReportsService;
  const tokens: Record<string, string> = {};

  let categoryId = '';
  let productA = '';
  let productB = '';
  const variant: Record<'V1' | 'V2' | 'V3', string> = { V1: '', V2: '', V3: '' };
  const wh: Record<'T' | 'S' | 'BIG', string> = { T: '', S: '', BIG: '' };
  let dealerA = '';
  let dealerB = '';
  const dealerUsers: string[] = [];
  const driverIds: string[] = [];
  const orderIds: string[] = [];

  const as = (role: keyof typeof STAFF, path: string) =>
    request(app.getHttpServer())
      .get(`${base}${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);

  const qs = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) search.set(k, String(v));

    return `?${search.toString()}`;
  };

  const report = async (key: string, params: Record<string, string | number | undefined> = {}) => {
    const res = await as('ADMIN', `/reports/${key}${qs(params)}`).expect(200);

    return res.body as {
      rows: Record<string, string | number | null>[];
      totals: Record<string, number>;
      truncated: boolean;
      columns: { key: string; label: string; type: string }[];
    };
  };

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const makeDealer = async (name: string) => {
    const user = await prisma.user.create({
      data: {
        email: `${SLUG}-${name}@barff.uz`,
        fullName: `E2E ${name}`,
        passwordHash: 'x',
      },
    });
    dealerUsers.push(user.id);

    const dealer = await prisma.dealer.create({
      data: {
        userId: user.id,
        companyName: `${SLUG} ${name} MChJ`,
        region: 'Toshkent',
        businessType: 'RETAIL',
        status: 'APPROVED',
      },
    });

    return dealer.id;
  };

  const makeOrder = async (input: {
    n: number;
    dealerId: string;
    region: string;
    createdAt: string;
    status: 'DELIVERED' | 'CONFIRMED' | 'IN_TRANSIT' | 'PACKED' | 'CANCELLED' | 'PENDING_REVIEW';
    discount?: number;
    items: { v: 'V1' | 'V2' | 'V3'; qty: number; price: number }[];
  }) => {
    const subtotal = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = input.discount ?? 0;

    const order = await prisma.order.create({
      data: {
        number: `E2E-REP-${STAMP}-${input.n}`,
        dealerId: input.dealerId,
        status: input.status,
        shippingLabel: 'E2E',
        shippingRegion: input.region,
        shippingAddress: 'Sinov 1',
        contactName: 'E2E',
        contactPhone: '998900000000',
        subtotal,
        discount,
        total: subtotal - discount,
        createdAt: at(input.createdAt),
        items: {
          create: input.items.map((item) => ({
            variantId: variant[item.v],
            sku: `E2E-REP-${item.v}-${STAMP}`,
            productName: L(item.v === 'V3' ? 'E2E B mahsulot' : 'E2E A mahsulot'),
            volumeMl: 1000,
            quantity: item.qty,
            basePrice: item.price,
            unitPrice: item.price,
            total: item.qty * item.price,
          })),
        },
      },
    });
    orderIds.push(order.id);

    return order;
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
    reports = app.get(ReportsService);

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

    categoryId = (
      await prisma.productCategory.create({ data: { slug: `${SLUG}-kat`, name: L('E2E hisobot') } })
    ).id;
    productA = (
      await prisma.product.create({
        data: {
          slug: `${SLUG}-a`,
          sku: `E2E-REP-A-${STAMP}`,
          categoryId,
          name: L('E2E A mahsulot'),
        },
      })
    ).id;
    productB = (
      await prisma.product.create({
        data: {
          slug: `${SLUG}-b`,
          sku: `E2E-REP-B-${STAMP}`,
          categoryId,
          name: L('E2E B mahsulot'),
        },
      })
    ).id;

    for (const [key, productId] of [
      ['V1', productA],
      ['V2', productA],
      ['V3', productB],
    ] as const) {
      variant[key] = (
        await prisma.productVariant.create({
          data: { productId, sku: `E2E-REP-${key}-${STAMP}`, volumeMl: 1000 },
        })
      ).id;
    }

    for (const [key, code, region] of [
      ['T', `E2ERT${String(STAMP).slice(-6)}`, REG_T],
      ['S', `E2ERS${String(STAMP).slice(-6)}`, REG_S],
      ['BIG', `E2ERB${String(STAMP).slice(-6)}`, REG_BIG],
    ] as const) {
      wh[key] = (await prisma.warehouse.create({ data: { code, name: `E2E ${key}`, region } })).id;
    }

    dealerA = await makeDealer('a');
    dealerB = await makeDealer('b');

    // ---------------------------------------------------------------- buyurtmalar
    /*
      KUN CHEGARASI (Toshkent = UTC+5):

      O2  2031-03-10T18:59:59.999Z = 03-10 23:59:59.999 Toshkent -> 03-10
      O3  2031-03-10T19:30:00.000Z = 03-11 00:30:00     Toshkent -> 03-11

      UTC bilan guruhlansa O3 ham 03-10 ga tushardi.
    */
    await makeOrder({
      n: 1,
      dealerId: dealerA,
      region: REG_T,
      createdAt: '2031-03-10T10:00:00Z',
      status: 'DELIVERED',
      discount: 5000,
      items: [
        { v: 'V1', qty: 3, price: 10000 },
        { v: 'V2', qty: 1, price: 20000 },
      ],
    });
    await makeOrder({
      n: 2,
      dealerId: dealerA,
      region: REG_T,
      createdAt: '2031-03-10T18:59:59.999Z',
      status: 'CONFIRMED',
      items: [{ v: 'V1', qty: 2, price: 10000 }],
    });
    await makeOrder({
      n: 3,
      dealerId: dealerB,
      region: REG_T,
      createdAt: '2031-03-10T19:30:00Z',
      status: 'IN_TRANSIT',
      items: [{ v: 'V3', qty: 5, price: 4000 }],
    });
    await makeOrder({
      n: 4,
      dealerId: dealerB,
      region: REG_S,
      createdAt: '2031-03-11T05:00:00Z',
      status: 'PACKED',
      items: [{ v: 'V2', qty: 2, price: 20000 }],
    });
    // Sotuv EMAS: bekor qilingan va hali qabul qilinmagan.
    await makeOrder({
      n: 5,
      dealerId: dealerA,
      region: REG_S,
      createdAt: '2031-03-12T12:00:00Z',
      status: 'CANCELLED',
      items: [{ v: 'V1', qty: 10, price: 10000 }],
    });
    await makeOrder({
      n: 6,
      dealerId: dealerB,
      region: REG_T,
      createdAt: '2031-03-12T12:00:00Z',
      status: 'PENDING_REVIEW',
      items: [{ v: 'V3', qty: 1, price: 30000 }],
    });

    // ---------------------------------------------------------------- haydovchilar va yetkazmalar
    for (const name of ['d1', 'd2']) {
      const user = await prisma.user.create({
        data: {
          email: `${SLUG}-${name}@barff.uz`,
          fullName: `E2E Haydovchi ${name}`,
          passwordHash: 'x',
        },
      });
      dealerUsers.push(user.id);
      driverIds.push((await prisma.driver.create({ data: { userId: user.id } })).id);
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, shippingRegion: true },
    });
    const byN = (n: number) => orders.find((o) => o.number.endsWith(`-${n}`))!;

    const makeDelivery = (
      n: number,
      status: 'DELIVERED' | 'FAILED' | 'ASSIGNED',
      driver: number,
      created: string,
      deliveredAt?: string,
    ) =>
      prisma.delivery.create({
        data: {
          number: `DLV-E2E-${STAMP}-${n}`,
          orderId: byN(n).id,
          status,
          driverId: driverIds[driver] as string,
          shippingLabel: 'E2E',
          shippingRegion: byN(n).shippingRegion,
          shippingAddress: 'Sinov 1',
          contactName: 'E2E',
          contactPhone: '998900000000',
          createdAt: at(created),
          ...(deliveredAt !== undefined ? { deliveredAt: at(deliveredAt) } : {}),
        },
      });

    // O1: 5 soatda topshirildi. O3: bajarilmadi. O4: hali yo'lda emas.
    await makeDelivery(1, 'DELIVERED', 0, '2031-03-10T10:00:00Z', '2031-03-10T15:00:00Z');
    await makeDelivery(3, 'FAILED', 0, '2031-03-10T19:30:00Z');
    await makeDelivery(4, 'ASSIGNED', 1, '2031-03-11T05:00:00Z');

    // ---------------------------------------------------------------- arizalar
    for (const [i, status] of (['NEW', 'NEW', 'CONVERTED', 'REJECTED'] as const).entries()) {
      await prisma.lead.create({
        data: {
          companyName: `${SLUG} ariza ${i}`,
          contactName: 'E2E',
          phone: `+99890${String(STAMP).slice(-6)}${i}`,
          region: REG_L,
          businessType: 'RETAIL',
          status,
          dedupeKey: `${SLUG}-lead-${i}`,
          createdAt: at(`2031-03-1${i}T08:00:00Z`),
        },
      });
    }

    // ---------------------------------------------------------------- ombor
    const move = (
      w: 'T' | 'S',
      v: 'V1' | 'V2',
      type: 'IN' | 'OUT' | 'RESERVED',
      quantity: number,
      createdAt: string,
    ) =>
      prisma.stockMovement.create({
        data: {
          warehouseId: wh[w],
          productVariantId: variant[v],
          type,
          quantity,
          createdAt: at(createdAt),
        },
      });

    await move('T', 'V1', 'IN', 100, '2031-03-10T08:00:00Z');
    await move('T', 'V2', 'IN', 50, '2031-03-10T08:05:00Z');
    await move('T', 'V1', 'RESERVED', 10, '2031-03-10T09:00:00Z');
    await move('S', 'V1', 'IN', 30, '2031-03-11T08:00:00Z');
    await move('T', 'V1', 'OUT', 5, '2031-03-11T09:00:00Z');

    // Katta jurnal: oqimli eksportni sinash uchun.
    await prisma.$executeRaw`
      INSERT INTO stock_movements (id, "warehouseId", "productVariantId", type, quantity, "createdAt")
      SELECT gen_random_uuid(), ${wh.BIG}::uuid, ${variant.V3}::uuid, 'IN', 1,
             timestamp '2031-04-01 00:00:00' + (g || ' seconds')::interval
      FROM generate_series(1, 10000) g`;
  }, 120_000);

  afterAll(async () => {
    await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.lead.deleteMany({ where: { region: REG_L } });
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } });
    await prisma.dealer.deleteMany({ where: { id: { in: [dealerA, dealerB] } } });

    const whIds = Object.values(wh);
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" DISABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.stockMovement.deleteMany({ where: { warehouseId: { in: whIds } } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "stock_movements" ENABLE TRIGGER stock_movement_no_delete',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" DISABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouseStock.deleteMany({ where: { warehouseId: { in: whIds } } });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "warehouse_stock" ENABLE TRIGGER warehouse_stock_guard',
    );
    await prisma.warehouse.deleteMany({ where: { id: { in: whIds } } });

    await prisma.productVariant.deleteMany({ where: { productId: { in: [productA, productB] } } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { entity: 'report' } });

    const emails = Object.values(STAFF).map((s) => s.email);
    await prisma.userRole.deleteMany({
      where: { OR: [{ user: { email: { in: emails } } }, { userId: { in: dealerUsers } }] },
    });
    await prisma.user.deleteMany({
      where: { OR: [{ email: { in: emails } }, { id: { in: dealerUsers } }] },
    });

    await app.close();
    await prisma.$disconnect();
  }, 120_000);

  // ===========================================================================
  // 1. SOTUV — manba jadvaldan mustaqil hisob
  // ===========================================================================

  it('SOTUV kunlar boyicha manbaga TENG (Toshkent kuni bilan)', async () => {
    const result = await report('sales', WINDOW);

    // Mustaqil hisob: manba qatorlar + `Intl` kuni + statuslar ro'yxati.
    const source = await prisma.order.findMany({
      where: { id: { in: orderIds }, status: { in: [...SALES_ORDER_STATUSES] } },
      select: { createdAt: true, subtotal: true, discount: true, total: true, status: true },
    });

    const expected = new Map<
      string,
      { orders: number; subtotal: number; discount: number; total: number; delivered: number }
    >();
    for (const o of source) {
      const day = tashkentDay(o.createdAt);
      const cur = expected.get(day) ?? {
        orders: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
        delivered: 0,
      };
      cur.orders += 1;
      cur.subtotal += o.subtotal;
      cur.discount += o.discount;
      cur.total += o.total;
      if (o.status === 'DELIVERED') cur.delivered += 1;
      expected.set(day, cur);
    }

    expect(result.rows.map((r) => r['day'])).toEqual([...expected.keys()].sort());
    for (const row of result.rows) {
      const want = expected.get(row['day'] as string);
      expect(row, String(row['day'])).toMatchObject(want as object);
    }

    // QOLDA yozilgan raqamlar (ikkala hisob bir xil xato qilsa ham ushlanadi).
    expect(result.rows).toEqual([
      { day: '2031-03-10', orders: 2, subtotal: 70000, discount: 5000, total: 65000, delivered: 1 },
      { day: '2031-03-11', orders: 2, subtotal: 60000, discount: 0, total: 60000, delivered: 0 },
    ]);
    expect(result.totals).toEqual({
      orders: 4,
      subtotal: 130000,
      discount: 5000,
      total: 125000,
      delivered: 1,
    });
  });

  /**
   * UTC bilan guruhlansa O3 (03-10T19:30Z) 03-10 ga tushardi. Toshkent
   * kuni bo'yicha u 03-11 da.
   */
  it('kun chegarasi: 23:59:59.999 shu kunda, 00:30 KEYINGI kunda', async () => {
    const result = await report('sales', { ...WINDOW, region: REG_T });

    expect(result.rows.map((r) => [r['day'], r['orders']])).toEqual([
      ['2031-03-10', 2],
      ['2031-03-11', 1],
    ]);
  });

  it('SOTUV: bekor qilingan va qabul qilinmagan buyurtma KIRMAYDI', async () => {
    const result = await report('sales', { ...WINDOW, region: REG_S });

    // O4 (PACKED) bor; O5 (CANCELLED) yo'q.
    expect(result.totals['orders']).toBe(1);
    expect(result.totals['total']).toBe(40000);
  });

  it('SOTUV: diler filtri', async () => {
    const result = await report('sales', { ...WINDOW, dealerId: dealerB });

    // dealerB: O3 (20000) + O4 (40000); O6 qabul qilinmagan.
    expect(result.totals['orders']).toBe(2);
    expect(result.totals['total']).toBe(60000);
  });

  // ===========================================================================
  // 2. BUYURTMALAR — hamma holat, shu jumladan bekor qilinganlar
  // ===========================================================================

  it('BUYURTMALAR holatlar boyicha manbaga TENG', async () => {
    const result = await report('orders', WINDOW);

    const source = await prisma.order.groupBy({
      by: ['status'],
      where: { id: { in: orderIds } },
      _count: true,
      _sum: { total: true },
    });

    const got = Object.fromEntries(
      result.rows.map((r) => [r['status'], [r['orders'], r['total']]]),
    );
    const want = Object.fromEntries(source.map((s) => [s.status, [s._count, s._sum.total]]));

    expect(got).toEqual(want);
    // Sotuvdan farqli: bekor qilingan (100000) va kutilayotgan (30000) BOR.
    expect(got['CANCELLED']).toEqual([1, 100000]);
    expect(got['PENDING_REVIEW']).toEqual([1, 30000]);
  });

  // ===========================================================================
  // 3. DILERLAR
  // ===========================================================================

  it('DILERLAR samaradorligi manbaga TENG', async () => {
    const result = await report('dealer-performance', WINDOW);
    const byDealer = Object.fromEntries(
      result.rows.map((r) => [String(r['dealer']).replace(`${SLUG} `, ''), r]),
    );

    // dealerA: O1 (45000, yetkazilgan) + O2 (20000). dealerB: O3 (20000) + O4 (40000).
    expect(byDealer['a MChJ']).toMatchObject({
      orders: 2,
      total: 65000,
      average: 32500,
      delivered: 1,
      deliveredTotal: 45000,
      deliveredShare: 50,
    });
    expect(byDealer['b MChJ']).toMatchObject({
      orders: 2,
      total: 60000,
      average: 30000,
      delivered: 0,
      deliveredTotal: 0,
      deliveredShare: 0,
    });
    // Tartib: summa kamayish bo'yicha.
    expect(result.rows.map((r) => r['total'])).toEqual([65000, 60000]);
    expect(result.totals['deliveredShare']).toBe(25);
  });

  it('qisqartirish: qatorlar kesiladi, JAMI esa TOLIQ', async () => {
    const result = await report('dealer-performance', { ...WINDOW, limit: 1 });

    expect(result.rows).toHaveLength(1);
    expect(result.truncated).toBe(true);
    // Jami kesilgan qatordan emas, butun tanlovdan.
    expect(result.totals['orders']).toBe(4);
    expect(result.totals['total']).toBe(125000);
  });

  // ===========================================================================
  // 4. MAHSULOT SOTUVI
  // ===========================================================================

  it('MAHSULOT sotuvi manbaga TENG', async () => {
    const result = await report('product-sales', WINDOW);

    const items = await prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, order: { status: { in: [...SALES_ORDER_STATUSES] } } },
      select: { variantId: true, quantity: true, total: true },
    });

    const want: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of items) {
      want[item.variantId] ??= { quantity: 0, revenue: 0 };
      (want[item.variantId] as { quantity: number; revenue: number }).quantity += item.quantity;
      (want[item.variantId] as { quantity: number; revenue: number }).revenue += item.total;
    }

    for (const key of ['V1', 'V2', 'V3'] as const) {
      const row = result.rows.find((r) => r['sku'] === `E2E-REP-${key}-${STAMP}`);
      expect(row, key).toMatchObject(want[variant[key]] as object);
    }

    // Qo'lda: V1 = 3+2 dona (O1, O2); O5 bekor qilingan, shuning uchun 10 dona KIRMAYDI.
    expect(result.rows.find((r) => String(r['sku']).includes('-V1-'))).toMatchObject({
      quantity: 5,
      revenue: 50000,
      orders: 2,
    });
    expect(result.rows.find((r) => String(r['sku']).includes('-V2-'))).toMatchObject({
      quantity: 3,
      revenue: 60000,
      orders: 2,
    });
  });

  it('MAHSULOT filtri: faqat tanlangan mahsulot', async () => {
    const result = await report('product-sales', { ...WINDOW, productId: productB });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ quantity: 5, revenue: 20000 });
  });

  // ===========================================================================
  // 5. HUDUDLAR
  // ===========================================================================

  it('HUDUDLAR boyicha sotuv manbaga TENG', async () => {
    const result = await report('regional-sales', WINDOW);
    const mine = result.rows.filter((r) => String(r['region']).startsWith('E2E-'));
    const got = Object.fromEntries(
      mine.map((r) => [r['region'], [r['orders'], r['total'], r['delivered']]]),
    );

    expect(got).toEqual({
      [REG_T]: [3, 85000, 1], // O1 45000 + O2 20000 + O3 20000
      [REG_S]: [1, 40000, 0], // O4
    });
  });

  // ===========================================================================
  // 6. QOLDIQLAR
  // ===========================================================================

  it('QOLDIQLAR manbaga TENG va BAND alohida', async () => {
    const [t, s] = await Promise.all([
      report('stock', { region: REG_T }),
      report('stock', { region: REG_S }),
    ]);

    const source = await prisma.warehouseStock.findMany({
      where: { warehouseId: { in: [wh.T, wh.S] } },
      select: { quantity: true, reservedQuantity: true },
    });

    expect((t.totals['quantity'] ?? 0) + (s.totals['quantity'] ?? 0)).toBe(
      source.reduce((n, r) => n + r.quantity, 0),
    );
    expect((t.totals['reserved'] ?? 0) + (s.totals['reserved'] ?? 0)).toBe(
      source.reduce((n, r) => n + r.reservedQuantity, 0),
    );

    // Qo'lda: V1 = 100 - 5 = 95, band 10, mavjud 85; V2 = 50.
    expect(
      t.rows.map((r) => [
        String(r['sku']).split('-')[2],
        r['quantity'],
        r['reserved'],
        r['available'],
      ]),
    ).toEqual([
      ['V1', 95, 10, 85],
      ['V2', 50, 0, 50],
    ]);
    expect(s.totals).toEqual({ quantity: 30, reserved: 0, available: 30 });
  });

  // ===========================================================================
  // 7. OMBOR HARAKATLARI
  // ===========================================================================

  it('HARAKATLAR jami manba jurnaliga TENG', async () => {
    const result = await report('stock-movements', { ...WINDOW, region: REG_T });

    const source = await prisma.stockMovement.findMany({
      where: { warehouseId: wh.T },
      select: { type: true, quantity: true },
    });

    expect(result.totals['movements']).toBe(source.length);
    expect(result.totals['inbound']).toBe(
      source.filter((m) => m.type === 'IN').reduce((n, m) => n + m.quantity, 0),
    );
    expect(result.totals['outbound']).toBe(
      source.filter((m) => m.type === 'OUT').reduce((n, m) => n + Math.abs(m.quantity), 0),
    );
    // Qo'lda: 4 ta harakat, 150 kirdi, 5 chiqdi.
    expect(result.totals).toEqual({ movements: 4, inbound: 150, outbound: 5 });
    expect(result.rows).toHaveLength(4);
  });

  it('HARAKATLAR: qisqartirilganda jami baribir TOLIQ', async () => {
    const result = await report('stock-movements', { region: REG_BIG, limit: 100 });

    expect(result.rows).toHaveLength(100);
    expect(result.truncated).toBe(true);
    expect(result.totals['movements']).toBe(10000);
  });

  // ===========================================================================
  // 8-9. YETKAZMALAR VA HAYDOVCHILAR
  // ===========================================================================

  it('YETKAZMALAR manbaga TENG, vaqt faqat TOPSHIRILGANLAR uchun', async () => {
    const result = await report('deliveries', { ...WINDOW });
    const rows = Object.fromEntries(result.rows.map((r) => [r['status'], r]));

    expect(rows['DELIVERED']).toMatchObject({ deliveries: 1, averageHours: 5 });
    expect(rows['FAILED']).toMatchObject({ deliveries: 1, averageHours: null });
    expect(rows['ASSIGNED']).toMatchObject({ deliveries: 1, averageHours: null });
    expect(result.totals).toMatchObject({ deliveries: 3, delivered: 1, failed: 1 });
  });

  it('HAYDOVCHILAR: muvaffaqiyat faqat YAKUNLANGAN ishlardan', async () => {
    const result = await report('driver-performance', { ...WINDOW });
    const byName = Object.fromEntries(
      result.rows.map((r) => [String(r['driver']).replace('E2E Haydovchi ', ''), r]),
    );

    // d1: 1 topshirdi, 1 bajarilmadi -> 50%. d2: 1 jarayonda — hali muvaffaqiyatsizlik EMAS.
    expect(byName['d1']).toMatchObject({
      assigned: 2,
      delivered: 1,
      failed: 1,
      open: 0,
      successRate: 50,
    });
    expect(byName['d2']).toMatchObject({
      assigned: 1,
      delivered: 0,
      failed: 0,
      open: 1,
      successRate: 0,
    });
  });

  // ===========================================================================
  // 10. ARIZALAR
  // ===========================================================================

  it('ARIZALAR konversiyasi manbaga TENG', async () => {
    const result = await report('lead-conversion', { region: REG_L });

    const source = await prisma.lead.groupBy({
      by: ['status'],
      where: { region: REG_L },
      _count: true,
    });
    const got = Object.fromEntries(result.rows.map((r) => [r['status'], r['leads']]));

    expect(got).toEqual(Object.fromEntries(source.map((s) => [s.status, s._count])));
    // Qo'lda: 4 ariza, 1 tasi diler bo'ldi -> 25%.
    expect(result.totals).toEqual({ leads: 4, converted: 1, conversionRate: 25 });
    expect(result.rows.find((r) => r['status'] === 'NEW')?.['share']).toBe(50);
  });

  // ===========================================================================
  // FILTR VA XATOLAR
  // ===========================================================================

  /**
   * TEGISHLI BO'LMAGAN FILTR — XATO.
   *
   * `stock` ga `dealerId` yuborgan iste'molchi filtrlangan natija oldim
   * deb o'ylardi, aslida BUTUN qoldiq kelardi.
   */
  it('hisobotga tegishli bolmagan filtr — 400, jim etiborsizlik emas', async () => {
    const res = await as('ADMIN', `/reports/stock${qs({ dealerId: dealerA })}`).expect(400);
    expect(res.body.code).toBe('REPORT_FILTER_UNSUPPORTED');

    // Sotuvda `productId` yo'q: u butun buyurtma summasini ko'rsatib chalg'itardi.
    await as('ADMIN', `/reports/sales${qs({ productId: productA })}`).expect(400);
  });

  it('notogri sana rad etiladi', async () => {
    await as('ADMIN', `/reports/sales${qs({ from: '2031-02-31' })}`).expect(400);
    await as('ADMIN', `/reports/sales${qs({ from: '10.03.2031' })}`).expect(400);
    await as('ADMIN', `/reports/sales${qs({ from: '2031-03-12', to: '2031-03-10' })}`).expect(400);
  });

  it('nomalum hisobot — 404', async () => {
    await as('ADMIN', '/reports/yoq-hisobot').expect(404);
  });

  it('hisobotlar royxati barcha 10 tani beradi', async () => {
    const res = await as('ADMIN', '/reports').expect(200);

    expect(res.body).toHaveLength(10);
  });

  // ===========================================================================
  // RUXSAT
  // ===========================================================================

  /** Ko'rish va fayl olish — ALOHIDA huquq (CLAUDE.md §3). */
  it('SALES koradi, lekin EKSPORT qila olmaydi', async () => {
    await as('SALES', `/reports/sales${qs(WINDOW)}`).expect(200);
    await as('SALES', `/reports/sales/export.csv${qs(WINDOW)}`).expect(403);
    await as('SALES', `/reports/sales/export.xlsx${qs(WINDOW)}`).expect(403);
  });

  it('autentifikatsiyasiz kirib bolmaydi', async () => {
    await request(app.getHttpServer()).get(`${base}/reports`).expect(401);
    await request(app.getHttpServer()).get(`${base}/reports/sales/export.csv`).expect(401);
  });

  // ===========================================================================
  // EKSPORT
  // ===========================================================================

  /** CSV qatorlari JSON qatorlariga TENG — ikki yo'l bir xil hisobotni beradi. */
  it('CSV JSON bilan bir xil raqamlarni beradi', async () => {
    const json = await report('regional-sales', WINDOW);
    const res = await as('ADMIN', `/reports/regional-sales/export.csv${qs(WINDOW)}`).expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.startsWith('﻿')).toBe(true);

    const lines = res.text.replace('﻿', '').trim().split('\r\n');
    expect(lines).toHaveLength(json.rows.length + 1);
    // Birlik OCHIQ: pul tiyinda.
    expect(lines[0]).toContain('Jami (tiyin)');
    expect(lines.join('\n')).toContain(`"${REG_T}","3","85000","1"`);
  });

  /**
   * FORMULA IN'EKSIYASI (hisobot eksporti).
   *
   * Dilerning kompaniya nomini o'zi kiritadi. `=` bilan boshlangan nom
   * Excel'da formula bo'lib ochilardi.
   */
  it("kompaniya nomidagi formula CSV da MATN bo'lib qoladi", async () => {
    const evil = '=HYPERLINK("http://x","bosing")';
    await prisma.dealer.update({ where: { id: dealerA }, data: { companyName: evil } });

    try {
      const res = await as('ADMIN', `/reports/dealer-performance/export.csv${qs(WINDOW)}`).expect(
        200,
      );

      expect(res.text).toContain(`"'=HYPERLINK(""http://x"",""bosing"")"`);
      expect(res.text).not.toMatch(/(^|,)"=HYPERLINK/m);
    } finally {
      await prisma.dealer.update({
        where: { id: dealerA },
        data: { companyName: `${SLUG} a MChJ` },
      });
    }
  });

  /** XLSX ni MUSTAQIL zip o'quvchi bilan ochib, qiymatlarni manbaga solishtiramiz. */
  it('XLSX ochiladi va qiymatlar JSON ga TENG', async () => {
    const json = await report('sales', WINDOW);

    const res = await as('ADMIN', `/reports/sales/export.xlsx${qs(WINDOW)}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');

    const files = unzip(res.body as Buffer);
    const sheet = files.get('xl/worksheets/sheet1.xml')?.toString() ?? '';

    for (const row of json.rows) {
      expect(sheet, String(row['day'])).toContain(String(row['day']));
      expect(sheet).toContain(`<v>${row['total']}</v>`);
    }
    expect(sheet).toContain('Jami (tiyin)');
  });

  it('eksport AUDIT jurnaliga tushadi', async () => {
    await as('ADMIN', `/reports/orders/export.csv${qs(WINDOW)}`).expect(200);

    const logs = await prisma.auditLog.count({ where: { entity: 'report', entityId: 'orders' } });
    expect(logs).toBeGreaterThanOrEqual(1);
  });

  it('CSV da filtr xatosi javob boshlanishidan OLDIN — 400', async () => {
    await as('ADMIN', `/reports/stock/export.csv${qs({ dealerId: dealerA })}`).expect(400);
  });

  // ===========================================================================
  // OQIMLI EKSPORT
  // ===========================================================================

  /**
   * S37 DoD: "exports stream without blocking the API".
   *
   * Uch narsa tekshiriladi:
   *  1. javob OQIM (`chunked`), butun fayl emas;
   *  2. jurnal BO'LAKLAB o'qiladi — xotirada bir vaqtda bitta bo'lak;
   *  3. eksport paytida hodisalar sikli to'xtab qolmaydi.
   */
  it('katta jurnal OQIMLI beriladi va qatorlar soni manbaga teng', async () => {
    let maxGap = 0;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      maxGap = Math.max(maxGap, now - last);
      last = now;
    }, 5);

    const res = await as(
      'ADMIN',
      `/reports/stock-movements/export.csv${qs({ region: REG_BIG })}`,
    ).expect(200);
    clearInterval(timer);

    // (1) Oqim: uzunlik oldindan noma'lum.
    expect(res.headers['transfer-encoding']).toBe('chunked');
    expect(res.headers['content-length']).toBeUndefined();

    const lines = res.text.replace('﻿', '').trim().split('\r\n');
    const source = await prisma.stockMovement.count({ where: { warehouseId: wh.BIG } });

    expect(source).toBe(10000);
    expect(lines).toHaveLength(source + 1);

    // (3) Hodisalar sikli: 10 000 qatorli eksport uni yarim soniya to'xtatmaydi.
    expect(maxGap).toBeLessThan(500);
  }, 60_000);

  it('jurnal BOLAKLAB oqiladi: har bolak chegaradan oshmaydi va hech qator yoqolmaydi', async () => {
    const batches: number[] = [];
    const seen = new Set<string>();

    for await (const batch of reports.ledgerBatches({ region: REG_BIG }, 1000)) {
      batches.push(batch.length);
      for (const row of batch) seen.add(String(row['createdAt']));
    }

    expect(batches).toEqual(new Array(10).fill(1000));
    // Takrorlanish yoki tushib qolish yo'q: kursor aynan davom etadi.
    expect(seen.size).toBe(10000);
  }, 60_000);

  it('kursor: bolak chegarasida tartib va toliqlik saqlanadi', async () => {
    const collected: string[] = [];
    for await (const batch of reports.ledgerBatches({ ...WINDOW, region: REG_T }, 3)) {
      collected.push(...batch.map((row) => `${row['type']}${row['quantity']}`));
    }

    const source = await prisma.stockMovement.findMany({
      where: { warehouseId: wh.T },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { type: true, quantity: true },
    });

    expect(collected).toEqual(source.map((m) => `${m.type}${m.quantity}`));
  });
});
