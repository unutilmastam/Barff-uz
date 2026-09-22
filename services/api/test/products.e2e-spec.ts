import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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

    it('tarjimasi tolmagan nomni rad etadi', async () => {
      const res = await createProduct(adminToken, {
        ...validBody('d'),
        name: { uz: 'Faqat ozbekcha' },
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
});
