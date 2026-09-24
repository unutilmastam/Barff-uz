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
const SLUG = `e2e-pricing-${STAMP}`;
const ADMIN = { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Pricing-Parol-2026' };

const L = (text: string) => ({ uz: text, ru: text, en: text });

/**
 * Narx dvigateli — HAQIQIY server orqali (S23).
 *
 * Ustunlik qoidalarining O'ZI sof funksiya testlarida
 * (`price-resolver.test.ts`, 35 ta holat). Bu yerda BOSHQA narsa
 * tekshiriladi: ma'lumot to'g'ri yuklanyaptimi, avtorizatsiya
 * ishlayaptimi va diler BOSHQA dilerning narxini ko'ra oladimi.
 */
describe('Pricing (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';

  let categoryId = '';
  let productId = '';
  let variantId = '';

  /** Ikkita diler: biri chegirmali daraja bilan, biri chegirmasiz. */
  const GOLD = { email: `${SLUG}-gold@barff.uz`, password: 'Diler-Gold-Parol-2026' };
  const PLAIN = { email: `${SLUG}-plain@barff.uz`, password: 'Diler-Plain-Parol-2026' };
  let goldToken = '';
  let plainToken = '';
  let goldDealerId = '';
  let tierId = '';

  const BASE_PRICE = 100_000; // 1000 so'm

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

  /** Diler yaratadi, tasdiqlaydi va tokenini qaytaradi. */
  const makeDealer = async (creds: { email: string; password: string }, suffix: string) => {
    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG}-${suffix} MChJ`,
        region: 'Toshkent',
        businessType: 'DISTRIBUTOR',
        contactName: 'Sinov Diler',
        phone: `+99894${String(4_000_000 + suffix.length * 7 + (STAMP % 900)).slice(0, 7)}`,
        email: creds.email,
        password: creds.password,
      })
      .expect(202);

    const dealer = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG}-${suffix} MChJ` },
      select: { id: true },
    });

    await asAdmin('patch', `/admin/dealers/${dealer.id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    return { id: dealer.id, token: await login(creds.email, creds.password) };
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
        fullName: 'E2E Pricing Admin',
        passwordHash: await passwords.hash(ADMIN.password),
        roles: { create: { roleId: role.id } },
      },
    });
    adminToken = await login(ADMIN.email, ADMIN.password);

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E narx kategoriya') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-PRICE-${STAMP}`,
        categoryId,
        name: L('E2E narx mahsuloti'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-PRICE-V-${STAMP}`, volumeMl: 1000 },
    });
    variantId = variant.id;

    await prisma.productPrice.create({
      data: { variantId, amount: BASE_PRICE, currency: 'UZS' },
    });

    const tier = await asAdmin('post', '/admin/dealer-tiers')
      .send({ code: `E2EP${STAMP % 100000}`, name: 'Oltin', discountBasisPoints: 500 })
      .expect(201);
    tierId = tier.body.id as string;

    const gold = await makeDealer(GOLD, 'gold');
    goldDealerId = gold.id;
    goldToken = gold.token;

    const plain = await makeDealer(PLAIN, 'plain');
    plainToken = plain.token;

    await asAdmin('patch', `/admin/dealers/${goldDealerId}/terms`).send({ tierId }).expect(200);
  });

  afterAll(async () => {
    const dealers = await prisma.dealer.findMany({
      where: { companyName: { startsWith: SLUG } },
      select: { id: true, userId: true },
    });
    const dealerIds = dealers.map((d) => d.id);
    const userIds = dealers.map((d) => d.userId);

    await prisma.priceRule.deleteMany({
      where: { OR: [{ productId }, { categoryId }, { tierId }] },
    });
    await prisma.dealerEvent.deleteMany({ where: { dealerId: { in: dealerIds } } });
    await prisma.dealerAddress.deleteMany({ where: { dealerId: { in: dealerIds } } });
    await prisma.dealer.deleteMany({ where: { id: { in: dealerIds } } });
    await prisma.dealerTier.deleteMany({ where: { id: tierId } });
    await prisma.productPrice.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { entity: { in: ['price_rule', 'dealer'] } } });
    await prisma.notification.deleteMany({
      where: { event: { in: ['dealer.registered', 'dealer.status.changed'] } },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });

    await prisma.$disconnect();
    await app?.close();
  });

  const quote = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`${base}/dealer/pricing/quote`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  // ===========================================================================

  it('qoida yo‘q bo‘lsa BAZAVIY narx qaytadi', async () => {
    const response = await quote(plainToken, {
      lines: [{ variantId, quantity: 1 }],
    }).expect(200);

    expect(response.body.lines[0].basePrice).toBe(BASE_PRICE);
    expect(response.body.lines[0].unitPrice).toBe(BASE_PRICE);
    expect(response.body.total).toBe(BASE_PRICE);
  });

  it('DARAJA chegirmasi bazadan o‘qilib qo‘llanadi', async () => {
    const response = await quote(goldToken, {
      lines: [{ variantId, quantity: 2 }],
    }).expect(200);

    // 5% = 500 bazis punkt.
    expect(response.body.lines[0].unitPrice).toBe(95_000);
    expect(response.body.lines[0].tierDiscountBasisPoints).toBe(500);
    expect(response.body.total).toBe(190_000);
  });

  it('jami summa SERVERDA hisoblanadi va pozitsiyalarga mos keladi', async () => {
    const response = await quote(goldToken, {
      lines: [
        { variantId, quantity: 3 },
        { variantId, quantity: 4 },
      ],
    }).expect(200);

    const lines = response.body.lines as { total: number }[];
    expect(response.body.total).toBe(lines.reduce((sum, l) => sum + l.total, 0));
  });

  describe('qoida qo‘llanishi', () => {
    let ruleId = '';

    it('admin qoida qo‘shadi va u DARHOL kuchga kiradi', async () => {
      const created = await asAdmin('post', '/admin/price-rules')
        .send({
          name: 'Hajm chegirmasi',
          kind: 'PERCENT_DISCOUNT',
          amount: 2000,
          productId,
          minQuantity: 10,
        })
        .expect(201);

      ruleId = created.body.id as string;

      const response = await quote(plainToken, {
        lines: [{ variantId, quantity: 10 }],
      }).expect(200);

      expect(response.body.lines[0].unitPrice).toBe(80_000);
      expect(response.body.lines[0].discountRule.name).toBe('Hajm chegirmasi');
    });

    it('miqdor yetmasa qoida qo‘llanmaydi', async () => {
      const response = await quote(plainToken, {
        lines: [{ variantId, quantity: 9 }],
      }).expect(200);

      expect(response.body.lines[0].unitPrice).toBe(BASE_PRICE);
    });

    it('qoida DARAJA chegirmasini almashtiradi, USTIGA qo‘shilmaydi', async () => {
      const response = await quote(goldToken, {
        lines: [{ variantId, quantity: 10 }],
      }).expect(200);

      // 20% qoida qo'llanadi, 5% daraja EMAS va ikkalasi birga EMAS.
      expect(response.body.lines[0].unitPrice).toBe(80_000);
      expect(response.body.lines[0].tierDiscountBasisPoints).toBeNull();
    });

    it('o‘chirilgan qoida qo‘llanmaydi', async () => {
      await asAdmin('delete', `/admin/price-rules/${ruleId}`).expect(204);

      const response = await quote(plainToken, {
        lines: [{ variantId, quantity: 10 }],
      }).expect(200);

      expect(response.body.lines[0].unitPrice).toBe(BASE_PRICE);
    });

    it('qoida o‘zgarishi AUDIT jurnaliga tushadi', async () => {
      const entries = await prisma.auditLog.findMany({
        where: { entity: 'price_rule', entityId: ruleId },
        orderBy: { createdAt: 'asc' },
      });

      // Yaratish + o'chirish.
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries[0]?.actorEmail).toBe(ADMIN.email);
    });
  });

  describe('qamrov: BOSHQA dilerning narxi', () => {
    it('dilerga atalgan qoida BOSHQA dilerga tegmaydi', async () => {
      await asAdmin('post', '/admin/price-rules')
        .send({
          name: 'Faqat gold uchun',
          kind: 'PERCENT_DISCOUNT',
          amount: 5000,
          productId,
          dealerId: goldDealerId,
        })
        .expect(201);

      const gold = await quote(goldToken, { lines: [{ variantId, quantity: 1 }] }).expect(200);
      expect(gold.body.lines[0].unitPrice).toBe(50_000);

      const plain = await quote(plainToken, { lines: [{ variantId, quantity: 1 }] }).expect(200);
      expect(plain.body.lines[0].unitPrice).toBe(BASE_PRICE);
    });

    it('diler BOSHQA dilerning narxini SO‘RAY olmaydi', async () => {
      /*
        `dealerId` so'rov tanasida YO'Q va bo'lmaydi — u sessiyadan
        olinadi. Shunga qaramay yuborib ko'ramiz: u jimgina
        e'tiborsiz qolishi kerak, narxni O'ZGARTIRMASLIGI kerak.
      */
      const response = await request(app.getHttpServer())
        .post(`${base}/dealer/pricing/quote`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ lines: [{ variantId, quantity: 1 }], dealerId: goldDealerId })
        .expect(200);

      expect(response.body.lines[0].unitPrice).toBe(BASE_PRICE);
    });
  });

  describe('avtorizatsiya', () => {
    it('tokensiz narx so‘rab bo‘lmaydi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/dealer/pricing/quote`)
        .send({ lines: [{ variantId, quantity: 1 }] })
        .expect(401);
    });

    it('diler narx QOIDASINI o‘zgartira olmaydi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/admin/price-rules`)
        .set('Authorization', `Bearer ${goldToken}`)
        .send({ name: 'O‘zimga', kind: 'PERCENT_DISCOUNT', amount: 9000 })
        .expect(403);
    });

    it('TASDIQLANMAGAN diler narx so‘ray olmaydi', async () => {
      const creds = { email: `${SLUG}-pending@barff.uz`, password: 'Diler-Pending-Parol-2026' };

      await request(app.getHttpServer())
        .post(`${base}/dealers/register`)
        .send({
          companyName: `${SLUG}-pending MChJ`,
          region: 'Toshkent',
          businessType: 'RETAIL',
          contactName: 'Kutayotgan',
          phone: `+99895${String(5_000_000 + (STAMP % 900)).slice(0, 7)}`,
          ...creds,
        })
        .expect(202);

      const token = await login(creds.email, creds.password);

      const response = await quote(token, { lines: [{ variantId, quantity: 1 }] }).expect(403);
      expect(response.body.code).toBe('DEALER_NOT_ACTIVE');
    });
  });

  describe('validatsiya', () => {
    it('foizli chegirma 100% dan oshmaydi', async () => {
      await asAdmin('post', '/admin/price-rules')
        .send({ name: 'Juda katta', kind: 'PERCENT_DISCOUNT', amount: 10_001 })
        .expect(400);
    });

    it('bo‘sh savat rad etiladi', async () => {
      await quote(plainToken, { lines: [] }).expect(400);
    });

    it('noma‘lum variant 404 beradi', async () => {
      await quote(plainToken, {
        lines: [{ variantId: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b', quantity: 1 }],
      }).expect(404);
    });

    it('nol yoki manfiy miqdor rad etiladi', async () => {
      await quote(plainToken, { lines: [{ variantId, quantity: 0 }] }).expect(400);
      await quote(plainToken, { lines: [{ variantId, quantity: -5 }] }).expect(400);
    });
  });
});
