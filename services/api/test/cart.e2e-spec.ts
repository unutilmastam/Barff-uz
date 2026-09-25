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
const SLUG = `e2e-cart-${STAMP}`;
const ADMIN = { email: `${SLUG}-admin@barff.uz`, password: 'E2E-Cart-Parol-2026' };
const DEALER = { email: `${SLUG}-dealer@barff.uz`, password: 'Diler-Cart-Parol-2026' };

const L = (text: string) => ({ uz: text, ru: text, en: text });
const BASE_PRICE = 100_000;

/**
 * Savat va diler katalogi (S25).
 *
 * IKKITA ASOSIY DA'VO tekshiriladi (`ROADMAP.md` S25 DoD):
 *   1. savat QURILMA ALMASHGANDA saqlanadi — u serverda;
 *   2. mijoz yuborgan NARX e'tiborga olinmaydi.
 */
describe('Cart (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let dealerToken = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let variant2Id = '';

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return res.body.accessToken as string;
  };

  const asDealer = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${dealerToken}`);

  const asAdmin = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

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
        fullName: 'E2E Cart Admin',
        passwordHash: await passwords.hash(ADMIN.password),
        roles: { create: { roleId: role.id } },
      },
    });
    adminToken = await login(ADMIN.email, ADMIN.password);

    const category = await prisma.productCategory.create({
      data: { slug: `${SLUG}-kat`, name: L('E2E savat kategoriya') },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `${SLUG}-mahsulot`,
        sku: `E2E-CART-${STAMP}`,
        categoryId,
        name: L('E2E savat mahsuloti'),
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `E2E-CART-V1-${STAMP}`, volumeMl: 1000, minOrderQuantity: 10 },
    });
    variantId = variant.id;

    const variant2 = await prisma.productVariant.create({
      data: { productId, sku: `E2E-CART-V2-${STAMP}`, volumeMl: 500 },
    });
    variant2Id = variant2.id;

    await prisma.productPrice.createMany({
      data: [
        { variantId, amount: BASE_PRICE, currency: 'UZS' },
        { variantId: variant2Id, amount: 50_000, currency: 'UZS' },
      ],
    });

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG} MChJ`,
        region: 'Toshkent',
        businessType: 'DISTRIBUTOR',
        contactName: 'Savat Diler',
        phone: `+99896${String(6_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        ...DEALER,
      })
      .expect(202);

    const dealer = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG} MChJ` },
      select: { id: true },
    });

    await asAdmin('patch', `/admin/dealers/${dealer.id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    dealerToken = await login(DEALER.email, DEALER.password);
  });

  afterAll(async () => {
    const dealers = await prisma.dealer.findMany({
      where: { companyName: { startsWith: SLUG } },
      select: { id: true, userId: true },
    });
    const dealerIds = dealers.map((d) => d.id);
    const userIds = dealers.map((d) => d.userId);

    await prisma.cartItem.deleteMany({ where: { cart: { dealerId: { in: dealerIds } } } });
    await prisma.cart.deleteMany({ where: { dealerId: { in: dealerIds } } });
    await prisma.priceRule.deleteMany({ where: { productId } });
    await prisma.dealerEvent.deleteMany({ where: { dealerId: { in: dealerIds } } });
    await prisma.dealer.deleteMany({ where: { id: { in: dealerIds } } });
    await prisma.productPrice.deleteMany({ where: { variantId: { in: [variantId, variant2Id] } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { entity: { in: ['dealer', 'price_rule'] } } });
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

  // ===========================================================================
  // KATALOG
  // ===========================================================================

  describe('katalog', () => {
    it('mahsulot DILER NARXI bilan qaytadi', async () => {
      const response = await asDealer('get', '/dealer/products?limit=60').expect(200);

      const product = (response.body.items as { slug: string }[]).find(
        (p) => p.slug === `${SLUG}-mahsulot`,
      ) as { variants: { id: string; price: { unitPrice: number } | null }[] } | undefined;

      expect(product).toBeDefined();
      const variant = product?.variants.find((v) => v.id === variantId);
      expect(variant?.price?.unitPrice).toBe(BASE_PRICE);
    });

    /*
      NARXSIZ VARIANT — S30 DA O'LCHAB TOPILGAN NOSOZLIK.

      `quote()` narxi belgilanmagan variant uchun `PRICE_NOT_SET`
      tashlardi va u BUTUN katalog so'rovini `400` ga aylantirardi.
      Ya'ni admin yangi variant qo'shib, narxini keyinroq
      belgilamoqchi bo'lsa, o'sha oraliqda HAMMA diler uchun
      katalog ishlamay qolardi.

      Panel buni allaqachon kutardi: `price === null` uchun "Narx
      belgilanmagan" deb chizadi. Ikki tomon bir-biriga ZID edi.
    */
    it('narxsiz variant KATALOGNI YIQITMAYDI', async () => {
      const bare = await prisma.productVariant.create({
        data: { productId, sku: `${SLUG}-narxsiz`, volumeMl: 250 },
        select: { id: true },
      });

      try {
        const response = await asDealer('get', '/dealer/products?limit=60').expect(200);

        const product = (response.body.items as { slug: string }[]).find(
          (p) => p.slug === `${SLUG}-mahsulot`,
        ) as { variants: { id: string; price: unknown }[] } | undefined;

        const unpriced = product?.variants.find((v) => v.id === bare.id);

        // Variant KO'RINADI, lekin narxsiz — yashirilmaydi.
        expect(unpriced).toBeDefined();
        expect(unpriced?.price).toBeNull();

        // Narxi bor variant O'Z narxini yo'qotmaydi.
        const priced = product?.variants.find((v) => v.id === variantId);
        expect((priced?.price as { unitPrice: number } | null)?.unitPrice).toBe(BASE_PRICE);
      } finally {
        await prisma.productVariant.delete({ where: { id: bare.id } });
      }
    });

    it('narxsiz variantni SAVATGA qo‘shib bo‘lmaydi — noma‘lum narxda sotilmaydi', async () => {
      const bare = await prisma.productVariant.create({
        data: { productId, sku: `${SLUG}-narxsiz-savat`, volumeMl: 330 },
        select: { id: true },
      });

      try {
        const response = await asDealer('post', '/dealer/cart/items')
          .send({ variantId: bare.id, quantity: 1 })
          .expect(400);

        expect(response.body.code).toBe('PRICE_NOT_SET');
      } finally {
        await prisma.cartItem.deleteMany({ where: { variantId: bare.id } });
        await prisma.productVariant.delete({ where: { id: bare.id } });
      }
    });

    it('kategoriya bo‘yicha filtrlaydi', async () => {
      const ours = await asDealer('get', `/dealer/products?categoryId=${categoryId}`).expect(200);
      expect(ours.body.items.length).toBeGreaterThan(0);

      const other = await asDealer(
        'get',
        '/dealer/products?categoryId=0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      ).expect(200);
      expect(other.body.items).toHaveLength(0);
    });

    it('hajm bo‘yicha filtrlaydi', async () => {
      const response = await asDealer('get', '/dealer/products?volumeMl=500&limit=60').expect(200);

      const product = (
        response.body.items as { slug: string; variants: { volumeMl: number }[] }[]
      ).find((p) => p.slug === `${SLUG}-mahsulot`);

      // Faqat 500 ml variant qoladi.
      expect(product?.variants.map((v) => v.volumeMl)).toEqual([500]);
    });

    it('qidiruv slug bo‘yicha ishlaydi', async () => {
      const response = await asDealer('get', `/dealer/products?search=${SLUG}`).expect(200);
      expect(response.body.items).toHaveLength(1);
    });

    it('TASDIQLANMAGAN diler katalogni ko‘ra olmaydi', async () => {
      const creds = { email: `${SLUG}-pending@barff.uz`, password: 'Diler-Pending-2026' };

      await request(app.getHttpServer())
        .post(`${base}/dealers/register`)
        .send({
          companyName: `${SLUG}-pending MChJ`,
          region: 'Toshkent',
          businessType: 'RETAIL',
          contactName: 'Kutayotgan',
          phone: `+99899${String(7_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
          ...creds,
        })
        .expect(202);

      const token = await login(creds.email, creds.password);

      await request(app.getHttpServer())
        .get(`${base}/dealer/products`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ===========================================================================
  // SAVAT
  // ===========================================================================

  describe('savat', () => {
    it('bo‘sh savat xatosiz ochiladi', async () => {
      const response = await asDealer('get', '/dealer/cart').expect(200);

      expect(response.body.lines).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('qo‘shadi va narxni SERVERDA hisoblaydi', async () => {
      const response = await asDealer('post', '/dealer/cart/items')
        .send({ variantId, quantity: 3 })
        .expect(201);

      expect(response.body.lines).toHaveLength(1);
      expect(response.body.lines[0].unitPrice).toBe(BASE_PRICE);
      expect(response.body.total).toBe(BASE_PRICE * 3);
    });

    it('bir xil variant ikki marta turmaydi — miqdor QO‘SHILADI', async () => {
      const response = await asDealer('post', '/dealer/cart/items')
        .send({ variantId, quantity: 2 })
        .expect(201);

      expect(response.body.lines).toHaveLength(1);
      expect(response.body.lines[0].quantity).toBe(5);
    });

    /**
     * ASOSIY DA'VO 1: MIJOZ YUBORGAN NARX E'TIBORGA OLINMAYDI.
     */
    it('mijoz yuborgan NARX e‘tiborga olinmaydi', async () => {
      const response = await asDealer('post', '/dealer/cart/items')
        .send({
          variantId: variant2Id,
          quantity: 1,
          // Bularning HAMMASI e'tiborsiz qolishi kerak.
          unitPrice: 1,
          price: 1,
          total: 1,
          discount: 99_999,
        })
        .expect(201);

      const line = (
        response.body.lines as { variantId: string; unitPrice: number; total: number }[]
      ).find((l) => l.variantId === variant2Id);

      expect(line?.unitPrice).toBe(50_000);
      expect(line?.total).toBe(50_000);
    });

    it('miqdorni ANIQ qiymatga qo‘yadi', async () => {
      const cart = await asDealer('get', '/dealer/cart').expect(200);
      const item = (cart.body.lines as { itemId: string; variantId: string }[]).find(
        (l) => l.variantId === variantId,
      );

      const response = await asDealer('patch', `/dealer/cart/items/${item?.itemId}`)
        .send({ quantity: 12 })
        .expect(200);

      const line = (response.body.lines as { variantId: string; quantity: number }[]).find(
        (l) => l.variantId === variantId,
      );
      expect(line?.quantity).toBe(12);
    });

    it('eng kam miqdor buzilgani BELGILANADI, lekin rad etilmaydi', async () => {
      const cart = await asDealer('get', '/dealer/cart').expect(200);
      const item = (cart.body.lines as { itemId: string; variantId: string }[]).find(
        (l) => l.variantId === variantId,
      );

      // `minOrderQuantity` = 10, biz 5 qo'yamiz.
      const response = await asDealer('patch', `/dealer/cart/items/${item?.itemId}`)
        .send({ quantity: 5 })
        .expect(200);

      const line = (response.body.lines as { variantId: string; belowMinimum: boolean }[]).find(
        (l) => l.variantId === variantId,
      );

      expect(line?.belowMinimum).toBe(true);
      expect(response.body.hasIssues).toBe(true);
    });

    it('miqdor 0 bo‘lsa pozitsiya o‘chadi', async () => {
      const cart = await asDealer('get', '/dealer/cart').expect(200);
      const item = (cart.body.lines as { itemId: string; variantId: string }[]).find(
        (l) => l.variantId === variant2Id,
      );

      const response = await asDealer('patch', `/dealer/cart/items/${item?.itemId}`)
        .send({ quantity: 0 })
        .expect(200);

      expect(
        (response.body.lines as { variantId: string }[]).some((l) => l.variantId === variant2Id),
      ).toBe(false);
    });

    it('manfiy miqdor rad etiladi', async () => {
      await asDealer('post', '/dealer/cart/items').send({ variantId, quantity: -5 }).expect(400);
    });

    it('noma‘lum variant 404 beradi', async () => {
      await asDealer('post', '/dealer/cart/items')
        .send({ variantId: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b', quantity: 1 })
        .expect(404);
    });
  });

  // ===========================================================================
  // ASOSIY DA'VO 2: QURILMA ALMASHGANDA SAQLANADI
  // ===========================================================================

  it('savat QURILMA ALMASHGANDA saqlanadi', async () => {
    const before = await asDealer('get', '/dealer/cart').expect(200);
    expect(before.body.lines.length).toBeGreaterThan(0);

    /*
      "Boshqa qurilma" = YANGI KIRISH, ya'ni yangi SESSIYA.

      DIQQAT: bu yerda access token'larni solishtirish MA'NOSIZ.
      Avval shunday yozgan edim va test yiqildi: JWT `iat` butun
      soniyada bo'lgani uchun bir soniya ichidagi ikki kirish
      BAYT-BAYT bir xil token beradi. Bu xato emas — da'vo ham u
      haqida emas.

      Sessiya ALOHIDA ekanini refresh cookie ko'rsatadi: uning
      ichida har safar yangi `jti` bo'ladi.
    */
    const second = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send(DEALER)
      .expect(200);

    const refreshOf = (response: { headers: Record<string, unknown> }) =>
      ((response.headers['set-cookie'] as string[] | undefined) ?? []).find((cookie) =>
        cookie.startsWith('barff_refresh='),
      );

    const firstLogin = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send(DEALER)
      .expect(200);

    expect(refreshOf(second)).toBeDefined();
    expect(refreshOf(second)).not.toBe(refreshOf(firstLogin));

    const otherDeviceToken = second.body.accessToken as string;

    const after = await request(app.getHttpServer())
      .get(`${base}/dealer/cart`)
      .set('Authorization', `Bearer ${otherDeviceToken}`)
      .expect(200);

    expect(after.body.lines).toHaveLength(before.body.lines.length);
    expect(after.body.total).toBe(before.body.total);
  });

  // ===========================================================================
  // NARX O'ZGARSA SAVAT HAM O'ZGARADI
  // ===========================================================================

  it('narx qoidasi qo‘shilsa savat DARHOL yangilanadi', async () => {
    const before = await asDealer('get', '/dealer/cart').expect(200);
    const beforeTotal = before.body.total as number;

    await asAdmin('post', '/admin/price-rules')
      .send({ name: 'Savat sinovi', kind: 'PERCENT_DISCOUNT', amount: 2000, productId })
      .expect(201);

    const after = await asDealer('get', '/dealer/cart').expect(200);

    // 20% chegirma — savatda narx SAQLANMAGANI shundan ko'rinadi.
    expect(after.body.total).toBe(Math.round(beforeTotal * 0.8));
  });

  it('aksiya kodi savatda saqlanadi va narxga ta‘sir qiladi', async () => {
    await asAdmin('post', '/admin/price-rules')
      .send({
        name: 'Savat aksiyasi',
        kind: 'PERCENT_DISCOUNT',
        amount: 5000,
        productId,
        code: `CART${STAMP % 100000}`,
      })
      .expect(201);

    const before = await asDealer('get', '/dealer/cart').expect(200);

    const withCode = await asDealer('put', '/dealer/cart/promo')
      .send({ code: `CART${STAMP % 100000}` })
      .expect(200);

    expect(withCode.body.promoCode).toBe(`CART${STAMP % 100000}`);
    expect(withCode.body.total).toBeLessThan(before.body.total);
    expect(withCode.body.lines[0].promoApplied).toBe(true);

    // Kod olib tashlansa narx qaytadi.
    const without = await asDealer('put', '/dealer/cart/promo').send({ code: null }).expect(200);
    expect(without.body.total).toBe(before.body.total);
  });

  it('NOMA‘LUM kod xato bermaydi — kodlarni taxmin qilishga yo‘l yo‘q', async () => {
    const response = await asDealer('put', '/dealer/cart/promo')
      .send({ code: 'BUNDAYKODYOQ' })
      .expect(200);

    expect(response.body.promoApplied).toBeUndefined();
    expect(response.body.lines[0].promoApplied).toBe(false);

    await asDealer('put', '/dealer/cart/promo').send({ code: null }).expect(200);
  });

  // ===========================================================================
  // BOSHQA DILERNING SAVATI
  // ===========================================================================

  it('BOSHQA dilerning savat pozitsiyasiga tegib bo‘lmaydi', async () => {
    const creds = { email: `${SLUG}-other@barff.uz`, password: 'Diler-Other-2026' };

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send({
        companyName: `${SLUG}-other MChJ`,
        region: 'Samarqand',
        businessType: 'RETAIL',
        contactName: 'Begona',
        phone: `+99893${String(8_000_000 + (STAMP % 900_000)).slice(0, 7)}`,
        ...creds,
      })
      .expect(202);

    const other = await prisma.dealer.findFirstOrThrow({
      where: { companyName: `${SLUG}-other MChJ` },
      select: { id: true },
    });

    await asAdmin('patch', `/admin/dealers/${other.id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const otherToken = await login(creds.email, creds.password);

    // Bizning savatimizdagi pozitsiya id si.
    const ourCart = await asDealer('get', '/dealer/cart').expect(200);
    const ourItemId = (ourCart.body.lines as { itemId: string }[])[0]?.itemId;
    expect(ourItemId).toBeDefined();

    // Begona diler uni o'zgartirmoqchi.
    await request(app.getHttpServer())
      .patch(`${base}/dealer/cart/items/${ourItemId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ quantity: 999 })
      .expect(404);

    // Va yozuv O'ZGARMAGAN.
    const check = await asDealer('get', '/dealer/cart').expect(200);
    const line = (check.body.lines as { itemId: string; quantity: number }[]).find(
      (l) => l.itemId === ourItemId,
    );
    expect(line?.quantity).not.toBe(999);
  });

  it('savatni bo‘shatadi', async () => {
    const response = await asDealer('delete', '/dealer/cart').expect(200);

    expect(response.body.lines).toEqual([]);
    expect(response.body.total).toBe(0);
  });
});
