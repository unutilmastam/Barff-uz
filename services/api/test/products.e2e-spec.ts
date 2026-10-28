import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const ADMIN = { email: 'e2e-prod@barff.uz', password: 'E2E-Prod-Parol-2026' };
const DRIVER = { email: 'e2e-prod-driver@barff.uz', password: 'E2E-ProdDriver-2026' };

const L = (text: string) => ({ uz: text, ru: text, en: text });

async function makeUser(email: string, password: string, roleCode: string): Promise<void> {
  const passwords = new PasswordService();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.user.create({
    data: {
      email,
      fullName: `E2E ${roleCode}`,
      passwordHash: await passwords.hash(password),
      roles: { create: { roleId: role.id } },
    },
  });
}

describe('Products (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let driverToken = '';
  let categoryId = '';
  const slugPrefix = `e2e-${Date.now()}`;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    await makeUser(ADMIN.email, ADMIN.password, 'ADMIN');
    await makeUser(DRIVER.email, DRIVER.password, 'DRIVER');

    const login = async (c: { email: string; password: string }) => {
      const res = await request(app.getHttpServer()).post(`${base}/auth/login`).send(c);
      return res.body.accessToken as string;
    };
    adminToken = await login(ADMIN);
    driverToken = await login(DRIVER);

    const category = await prisma.productCategory.create({
      data: { slug: `${slugPrefix}-kat`, name: L('E2E kategoriya') },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdProductIds } } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN.email, DRIVER.email] } } });
    await prisma.$disconnect();
    await app?.close();
  });

  const createProduct = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`${base}/admin/products`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const validBody = (suffix: string) => ({
    slug: `${slugPrefix}-${suffix}`,
    sku: `E2E-${suffix.toUpperCase()}`,
    categoryId,
    name: L(`E2E mahsulot ${suffix}`),
  });

  describe('avtorizatsiya', () => {
    it('tokensiz yaratib bolmaydi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/admin/products`)
        .send(validBody('a'))
        .expect(401);
    });

    it('products.manage ruxsati yoq rol 403 oladi', async () => {
      const res = await createProduct(driverToken, validBody('b')).expect(403);
      expect(res.body.code).toBe('FORBIDDEN_PERMISSION');
    });

    it('ommaviy royxat tokensiz ochiladi', async () => {
      await request(app.getHttpServer()).get(`${base}/products`).expect(200);
    });
  });

  describe('validatsiya', () => {
    it("noto'g'ri slugni rad etadi", async () => {
      const res = await createProduct(adminToken, {
        ...validBody('c'),
        slug: 'Katta Harf va Probel',
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details).toHaveProperty('slug');
    });

    /**
     * QISMAN tarjima QABUL QILINADI (S19 da o'zgardi).
     *
     * `text()` yordamchisi tarjimasi yo'q tilda boshqa tildagi matnni
     * ko'rsatadi, shuning uchun bo'sh nom xavfi yo'q. Uchala tilni
     * talab qilish esa "o'zbekcha yoz, ruschasini keyin qo'sh" degan
     * haqiqiy oqimni bloklardi.
     */
    it('qisman tarjimani qabul qiladi', async () => {
      await createProduct(adminToken, {
        ...validBody('d'),
        name: { uz: 'Faqat ozbekcha' },
      }).expect(201);
    });

    it('hech bir tilda nom bolmasa rad etadi', async () => {
      const res = await createProduct(adminToken, {
        ...validBody('d2'),
        name: { uz: '', ru: '', en: '' },
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('mavjud bolmagan kategoriyani rad etadi', async () => {
      const res = await createProduct(adminToken, {
        ...validBody('e'),
        categoryId: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      }).expect(404);

      expect(res.body.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('slug unikalligi', () => {
    it('takroriy slugni 409 bilan rad etadi', async () => {
      const body = validBody('unik');
      const first = await createProduct(adminToken, body).expect(201);
      createdProductIds.push(first.body.id);

      const res = await createProduct(adminToken, { ...body, sku: 'E2E-BOSHQA-SKU' }).expect(409);

      expect(res.body.code).toBe('DUPLICATE_VALUE');
      expect(res.body.details).toBeDefined();
    });

    it('takroriy SKU ni ham 409 bilan rad etadi', async () => {
      const body = validBody('sku1');
      const first = await createProduct(adminToken, body).expect(201);
      createdProductIds.push(first.body.id);

      await createProduct(adminToken, { ...body, slug: `${slugPrefix}-sku2` }).expect(409);
    });
  });

  describe('ommaviy API faol holatni hurmat qiladi', () => {
    it("faol bo'lmagan mahsulot ommaviy royxatda korinmaydi", async () => {
      const created = await createProduct(adminToken, {
        ...validBody('yashirin'),
        isActive: false,
      }).expect(201);
      createdProductIds.push(created.body.id);

      const res = await request(app.getHttpServer()).get(`${base}/products?limit=100`).expect(200);

      const slugs = (res.body.items as { slug: string }[]).map((p) => p.slug);
      expect(slugs).not.toContain(created.body.slug);
    });

    it("faol bo'lmagan mahsulot slug boyicha ham 404", async () => {
      const created = await createProduct(adminToken, {
        ...validBody('yashirin2'),
        isActive: false,
      }).expect(201);
      createdProductIds.push(created.body.id);

      await request(app.getHttpServer()).get(`${base}/products/${created.body.slug}`).expect(404);
    });

    it("o'chirilgan mahsulot ommaviy API da yo'q", async () => {
      const created = await createProduct(adminToken, validBody('ochirilgan')).expect(201);
      createdProductIds.push(created.body.id);

      // Avval ko'rinadi.
      await request(app.getHttpServer()).get(`${base}/products/${created.body.slug}`).expect(200);

      await request(app.getHttpServer())
        .delete(`${base}/admin/products/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // O'chirilgandan keyin yo'q.
      await request(app.getHttpServer()).get(`${base}/products/${created.body.slug}`).expect(404);
    });

    it("yumshoq o'chirish yozuvni bazada saqlab qoladi", async () => {
      const created = await createProduct(adminToken, validBody('yumshoq')).expect(201);
      createdProductIds.push(created.body.id);

      await request(app.getHttpServer())
        .delete(`${base}/admin/products/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Buyurtmalar tarixida havola qilingan bo'lishi mumkin.
      const row = await prisma.product.findUnique({ where: { id: created.body.id } });
      expect(row).not.toBeNull();
      expect(row?.deletedAt).not.toBeNull();
    });
  });

  describe('variantlar va narxlar', () => {
    it('variant qoshadi va kasr hajmni rad etadi', async () => {
      const created = await createProduct(adminToken, validBody('variant')).expect(201);
      createdProductIds.push(created.body.id);

      const ok = await request(app.getHttpServer())
        .post(`${base}/admin/products/${created.body.id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: `E2E-VAR-${Date.now()}`, volumeMl: 500 })
        .expect(201);

      expect(ok.body.volumeMl).toBe(500);

      await request(app.getHttpServer())
        .post(`${base}/admin/products/${created.body.id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'E2E-VAR-KASR', volumeMl: 0.5 })
        .expect(400);
    });

    it('narx butun tiyinda qabul qilinadi, kasr rad etiladi', async () => {
      const created = await createProduct(adminToken, validBody('narx')).expect(201);
      createdProductIds.push(created.body.id);

      const variant = await request(app.getHttpServer())
        .post(`${base}/admin/products/${created.body.id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: `E2E-NARX-${Date.now()}`, volumeMl: 1000 })
        .expect(201);

      const price = await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1_250_000 })
        .expect(201);

      expect(price.body.amount).toBe(1_250_000);
      expect(price.body.currency).toBe('UZS');

      // Suzuvchi nuqta yig'indida xato to'playdi — rad etilishi shart.
      await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 12.5 })
        .expect(400);
    });
  });

  describe('qisman yangilash boshqa maydonlarni buzmaydi', () => {
    it('slugni ozgartirish isActive va displayOrder ni QAYTARMAYDI', async () => {
      const created = await createProduct(adminToken, {
        ...validBody('qisman'),
        isActive: false,
        displayOrder: 42,
      }).expect(201);
      createdProductIds.push(created.body.id);

      // Faqat slug yuboriladi. Zod'ning `.partial()` usuli bu yerda
      // `isActive: true` va `displayOrder: 0` qo'shib yuborardi — ya'ni
      // sarlavhani tahrirlash mahsulotni jimgina saytga chiqarib
      // yuborardi.
      const updated = await request(app.getHttpServer())
        .patch(`${base}/admin/products/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: `${slugPrefix}-qisman-yangi` })
        .expect(200);

      expect(updated.body.isActive).toBe(false);
      expect(updated.body.displayOrder).toBe(42);
      expect(updated.body.slug).toBe(`${slugPrefix}-qisman-yangi`);
    });
  });

  describe('ommaviy javob shakli', () => {
    it('kop tilli maydon TOLIQ obyekt sifatida qaytadi', async () => {
      const created = await createProduct(adminToken, validBody('tillar')).expect(201);
      createdProductIds.push(created.body.id);

      const res = await request(app.getHttpServer())
        .get(`${base}/products/${created.body.slug}`)
        .expect(200);

      // Til almashtirilganda qayta so'rov kerak bo'lmasligi uchun.
      expect(res.body.name).toHaveProperty('uz');
      expect(res.body.name).toHaveProperty('ru');
      expect(res.body.name).toHaveProperty('en');
    });

    it('kategoriyalar royxati ochiq', async () => {
      const res = await request(app.getHttpServer()).get(`${base}/products/categories`).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  describe('mahsulot rasmlari', () => {
    const createdAssetIds: string[] = [];

    const png = () =>
      sharp({ create: { width: 320, height: 480, channels: 3, background: '#2a7' } })
        .png()
        .toBuffer();

    const uploadAsset = async (visibility: 'PUBLIC' | 'PRIVATE') => {
      const res = await request(app.getHttpServer())
        .post(`${base}/media`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('visibility', visibility)
        .attach('file', await png(), 'shisha.png')
        .expect(201);
      createdAssetIds.push(res.body.id);
      return res.body.id as string;
    };

    const attach = (productId: string, body: Record<string, unknown>, token = adminToken) =>
      request(app.getHttpServer())
        .post(`${base}/admin/products/${productId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const publicImages = async (slug: string) => {
      const res = await request(app.getHttpServer()).get(`${base}/products/${slug}`).expect(200);
      return res.body.images as { id: string }[];
    };

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdAssetIds } } });
      await prisma.mediaAsset.deleteMany({ where: { id: { in: createdAssetIds } } });
    });

    it('birinchi rasm o‘zi asosiy bo‘ladi va saytga chiqadi', async () => {
      const product = await createProduct(adminToken, validBody('rasm1')).expect(201);
      createdProductIds.push(product.body.id);

      const first = await attach(product.body.id, {
        mediaAssetId: await uploadAsset('PUBLIC'),
      }).expect(201);
      expect(first.body.isPrimary).toBe(true);

      expect(await publicImages(product.body.slug)).toHaveLength(1);
    });

    it('ikkinchi rasm asosiy bo‘lmaydi; asosiy qilinsa eskisi tushadi', async () => {
      const product = await createProduct(adminToken, validBody('rasm2')).expect(201);
      createdProductIds.push(product.body.id);

      const a = await attach(product.body.id, { mediaAssetId: await uploadAsset('PUBLIC') });
      const b = await attach(product.body.id, { mediaAssetId: await uploadAsset('PUBLIC') });
      expect(b.body.isPrimary).toBe(false);

      await request(app.getHttpServer())
        .patch(`${base}/admin/products/images/${b.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPrimary: true })
        .expect(200);

      const rows = await prisma.productImage.findMany({ where: { productId: product.body.id } });
      expect(rows.filter((row) => row.isPrimary).map((row) => row.id)).toEqual([b.body.id]);
      expect(rows).toHaveLength(2);
      expect(a.body.id).toBeDefined();
    });

    it('asosiy rasmni "olib tashlab" bo‘lmaydi', async () => {
      const product = await createProduct(adminToken, validBody('rasm3')).expect(201);
      createdProductIds.push(product.body.id);

      const image = await attach(product.body.id, { mediaAssetId: await uploadAsset('PUBLIC') });

      const res = await request(app.getHttpServer())
        .patch(`${base}/admin/products/images/${image.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPrimary: false })
        .expect(409);
      expect(res.body.code).toBe('PRIMARY_IMAGE_REQUIRED');
    });

    it('asosiy rasm o‘chsa, qolganidan biri asosiy bo‘ladi', async () => {
      const product = await createProduct(adminToken, validBody('rasm4')).expect(201);
      createdProductIds.push(product.body.id);

      const a = await attach(product.body.id, { mediaAssetId: await uploadAsset('PUBLIC') });
      const b = await attach(product.body.id, { mediaAssetId: await uploadAsset('PUBLIC') });

      await request(app.getHttpServer())
        .delete(`${base}/admin/products/images/${a.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const rows = await prisma.productImage.findMany({ where: { productId: product.body.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe(b.body.id);
      expect(rows[0]?.isPrimary).toBe(true);
    });

    it('maxfiy faylni biriktirib bo‘lmaydi (saytda ko‘rinmaydi)', async () => {
      const product = await createProduct(adminToken, validBody('rasm5')).expect(201);
      createdProductIds.push(product.body.id);

      const res = await attach(product.body.id, {
        mediaAssetId: await uploadAsset('PRIVATE'),
      }).expect(409);
      expect(res.body.code).toBe('MEDIA_NOT_PUBLIC_IMAGE');
    });

    it('mavjud bo‘lmagan fayl 404, takroriy biriktirish 409', async () => {
      const product = await createProduct(adminToken, validBody('rasm6')).expect(201);
      createdProductIds.push(product.body.id);

      await attach(product.body.id, {
        mediaAssetId: '00000000-0000-4000-8000-000000000000',
      }).expect(404);

      const assetId = await uploadAsset('PUBLIC');
      await attach(product.body.id, { mediaAssetId: assetId }).expect(201);
      await attach(product.body.id, { mediaAssetId: assetId }).expect(409);
    });

    it('products.manage ruxsatisiz rol 403 oladi', async () => {
      const product = await createProduct(adminToken, validBody('rasm7')).expect(201);
      createdProductIds.push(product.body.id);

      await attach(
        product.body.id,
        { mediaAssetId: await uploadAsset('PUBLIC') },
        driverToken,
      ).expect(403);
    });
  });

  describe('admin muharriri uchun detal va royxat', () => {
    it('detal HAMMA variantni (nofaollarni ham), joriy narx va rasmni qaytaradi', async () => {
      const product = await createProduct(adminToken, validBody('detal')).expect(201);
      createdProductIds.push(product.body.id);

      const variant = await request(app.getHttpServer())
        .post(`${base}/admin/products/${product.body.id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: `E2E-DET-${Date.now()}`, volumeMl: 330, isActive: false })
        .expect(201);

      await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 500_000 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 600_000 })
        .expect(201);

      const detail = await request(app.getHttpServer())
        .get(`${base}/admin/products/${product.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(detail.body.variants).toHaveLength(1);
      expect(detail.body.variants[0].isActive).toBe(false);
      expect(detail.body.variants[0].currentPrice.amount).toBe(600_000);
      expect(detail.body.variants[0].prices.map((p: { amount: number }) => p.amount)).toEqual([
        600_000, 500_000,
      ]);
      expect(detail.body.images).toEqual([]);

      // Ommaviy javobda esa nofaol variant YO'Q.
      await request(app.getHttpServer())
        .patch(`${base}/admin/products/${product.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);
      const pub = await request(app.getHttpServer())
        .get(`${base}/products/${validBody('detal').slug}`)
        .expect(200);
      expect(pub.body.variants).toHaveLength(0);
    });

    it('royxat narx oraligi va kategoriyani beradi', async () => {
      const product = await createProduct(adminToken, validBody('oraliq')).expect(201);
      createdProductIds.push(product.body.id);

      for (const [i, amount] of [300_000, 900_000].entries()) {
        const variant = await request(app.getHttpServer())
          .post(`${base}/admin/products/${product.body.id}/variants`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ sku: `E2E-ORA-${Date.now()}-${i}`, volumeMl: 250 + i })
          .expect(201);
        await request(app.getHttpServer())
          .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ amount })
          .expect(201);
      }

      const list = await request(app.getHttpServer())
        .get(`${base}/admin/products?limit=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const row = list.body.items.find((item: { id: string }) => item.id === product.body.id);

      expect(row.variantCount).toBe(2);
      expect(row.priceFrom).toBe(300_000);
      expect(row.priceTo).toBe(900_000);
      expect(row.category.id).toBe(categoryId);
      expect(row.thumbnail).toBeNull();
    });
  });

  describe('admin kategoriyalar', () => {
    const createdCategoryIds: string[] = [];
    const cat = (token: string) => ({
      post: (body: Record<string, unknown>) =>
        request(app.getHttpServer())
          .post(`${base}/admin/categories`)
          .set('Authorization', `Bearer ${token}`)
          .send(body),
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdCategoryIds } } });
      await prisma.productCategory.deleteMany({ where: { id: { in: createdCategoryIds } } });
    });

    it('ruxsatsiz rol yarata olmaydi (403), tokensiz 401', async () => {
      await cat(driverToken)
        .post({ slug: `${slugPrefix}-x`, name: L('X') })
        .expect(403);
      await request(app.getHttpServer()).get(`${base}/admin/categories`).expect(401);
    });

    it('yaratadi, slug takrorini 409 bilan rad etadi, audit yoziladi', async () => {
      const res = await cat(adminToken)
        .post({ slug: `${slugPrefix}-a`, name: L('A kategoriya') })
        .expect(201);
      createdCategoryIds.push(res.body.id);

      const dup = await cat(adminToken)
        .post({ slug: `${slugPrefix}-a`, name: L('Boshqa') })
        .expect(409);
      expect(dup.body.code).toBe('DUPLICATE_VALUE');

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: res.body.id, action: 'product.category.created' },
      });
      expect(audit).not.toBeNull();
    });

    it('tsikl hosil qiluvchi ota kategoriyani rad etadi', async () => {
      const parent = await cat(adminToken)
        .post({ slug: `${slugPrefix}-p`, name: L('Ota') })
        .expect(201);
      createdCategoryIds.push(parent.body.id);
      const child = await cat(adminToken)
        .post({ slug: `${slugPrefix}-c`, name: L('Bola'), parentId: parent.body.id })
        .expect(201);
      createdCategoryIds.push(child.body.id);

      const res = await request(app.getHttpServer())
        .patch(`${base}/admin/categories/${parent.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: child.body.id })
        .expect(409);
      expect(res.body.code).toBe('CATEGORY_CYCLE');

      await request(app.getHttpServer())
        .patch(`${base}/admin/categories/${parent.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: parent.body.id })
        .expect(409);
    });

    it("mahsuloti yoki ichki kategoriyasi bor kategoriyani o'chirib bo'lmaydi", async () => {
      const res = await request(app.getHttpServer())
        .delete(`${base}/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Ushbu fayldagi kategoriyada mahsulotlar bor.
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CATEGORY_NOT_EMPTY');
    });

    it("bo'sh kategoriyani o'chiradi va ro'yxatdan yo'qoladi", async () => {
      const created = await cat(adminToken)
        .post({ slug: `${slugPrefix}-del`, name: L("O'chadi") })
        .expect(201);
      createdCategoryIds.push(created.body.id);

      await request(app.getHttpServer())
        .delete(`${base}/admin/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get(`${base}/admin/categories?limit=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.body.items.some((c: { id: string }) => c.id === created.body.id)).toBe(false);
      expect(
        list.body.items.find((c: { id: string }) => c.id === categoryId).productCount,
      ).toBeGreaterThan(0);
    });
  });
});
