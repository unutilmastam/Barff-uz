import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { CacheService } from '../src/public/cache/cache.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;
const L = (t: string) => ({ uz: t, ru: t, en: t });

const ADMIN = { email: 'e2e-cache@barff.uz', password: 'E2E-Cache-Parol-2026' };

describe('Ommaviy API keshi (e2e)', () => {
  let app: INestApplication;
  let cache: CacheService;
  let token = '';
  let categoryId = '';
  let productId = '';
  const prefix = `e2e-k-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    cache = app.get(CacheService);

    const passwords = new PasswordService();
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        fullName: 'E2E Cache',
        passwordHash: await passwords.hash(ADMIN.password),
        roles: { create: { roleId: role.id } },
      },
    });

    const login = await request(app.getHttpServer()).post(`${base}/auth/login`).send(ADMIN);
    token = login.body.accessToken;

    const category = await prisma.productCategory.create({
      data: { slug: `${prefix}-kat`, name: L('Kesh kategoriya') },
    });
    categoryId = category.id;

    const product = await request(app.getHttpServer())
      .post(`${base}/admin/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug: `${prefix}-mahsulot`,
        sku: `KESH-${Date.now()}`,
        categoryId,
        name: L('Kesh mahsuloti'),
      })
      .expect(201);
    productId = product.body.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: productId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });
    await prisma.$disconnect();
    await app?.close();
  });

  const publicProduct = () =>
    request(app.getHttpServer()).get(`${base}/products/${prefix}-mahsulot`);

  describe('kesh hit / miss', () => {
    it('ikkinchi sorov AYNAN bir xil javob qaytaradi (hit)', async () => {
      const first = await publicProduct().expect(200);
      const second = await publicProduct().expect(200);

      expect(second.body).toEqual(first.body);
    });

    it('kesh versiyasi oshsa, javob qayta hisoblanadi', async () => {
      const before = await cache.currentVersion('products');
      await cache.invalidate('products');
      const after = await cache.currentVersion('products');

      expect(Number(after)).toBe(Number(before) + 1);
    });
  });

  describe('ADMIN OZGARISHI KESHNI BEKOR QILADI', () => {
    beforeEach(async () => {
      // Har testdan oldin kesh to'ldirilgan bo'lsin.
      await publicProduct().expect(200);
    });

    it('nom ozgarishi BIR sorov siklida korinadi', async () => {
      const yangiNom = `Yangilangan ${Date.now()}`;

      await request(app.getHttpServer())
        .patch(`${base}/admin/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: L(yangiNom) })
        .expect(200);

      // Kutish YO'Q: keyingi so'rov darhol yangi qiymatni olishi kerak.
      const res = await publicProduct().expect(200);
      expect(res.body.name.uz).toBe(yangiNom);
    });

    it('yangi variant darhol korinadi', async () => {
      const sku = `KESH-VAR-${Date.now()}`;

      await request(app.getHttpServer())
        .post(`${base}/admin/products/${productId}/variants`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sku, volumeMl: 750 })
        .expect(201);

      const res = await publicProduct().expect(200);
      expect((res.body.variants as { sku: string }[]).map((v) => v.sku)).toContain(sku);
    });

    it('narx ozgarishi darhol korinadi', async () => {
      const variant = await request(app.getHttpServer())
        .post(`${base}/admin/products/${productId}/variants`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: `KESH-NARX-${Date.now()}`, volumeMl: 330 })
        .expect(201);

      await publicProduct().expect(200);

      await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variant.body.id}/prices`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 999_000 })
        .expect(201);

      // Eski narx ko'rinib turishi — eng zararli kesh xatosi.
      const res = await publicProduct().expect(200);
      const found = (res.body.variants as { id: string; price: { amount: number } | null }[]).find(
        (v) => v.id === variant.body.id,
      );
      expect(found?.price?.amount).toBe(999_000);
    });

    it("o'chirilgan mahsulot keshdan ham yo'qoladi", async () => {
      const created = await request(app.getHttpServer())
        .post(`${base}/admin/products`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          slug: `${prefix}-ochiriladi`,
          sku: `KESH-OCH-${Date.now()}`,
          categoryId,
          name: L('O‘chiriladi'),
        })
        .expect(201);

      await request(app.getHttpServer()).get(`${base}/products/${prefix}-ochiriladi`).expect(200);

      await request(app.getHttpServer())
        .delete(`${base}/admin/products/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer()).get(`${base}/products/${prefix}-ochiriladi`).expect(404);
    });
  });

  describe('ETag va Cache-Control', () => {
    it('ETag sarlavhasi beriladi', async () => {
      const res = await publicProduct().expect(200);
      expect(res.headers['etag']).toMatch(/^W\//);
    });

    it('Cache-Control ommaviy va muddatli', async () => {
      const res = await publicProduct().expect(200);
      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers['cache-control']).toContain('max-age=');
      expect(res.headers['cache-control']).toContain('stale-while-revalidate=');
    });

    it('If-None-Match mos kelsa 304 va TANA YUBORILMAYDI', async () => {
      const first = await publicProduct().expect(200);
      const etag = first.headers['etag'] as string;

      const second = await request(app.getHttpServer())
        .get(`${base}/products/${prefix}-mahsulot`)
        .set('If-None-Match', etag)
        .expect(304);

      expect(second.text === '' || second.text === undefined).toBe(true);
    });

    it('kontent ozgargach ETag ham ozgaradi', async () => {
      const before = (await publicProduct().expect(200)).headers['etag'];

      await request(app.getHttpServer())
        .patch(`${base}/admin/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: L(`ETag sinovi ${Date.now()}`) })
        .expect(200);

      const after = (await publicProduct().expect(200)).headers['etag'];
      expect(after).not.toBe(before);
    });

    it('ADMIN javoblarida ommaviy Cache-Control YOQ', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/admin/products`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Admin ma'lumoti CDN yoki brauzerda keshlanmasligi kerak.
      expect(res.headers['cache-control'] ?? '').not.toContain('public');
    });
  });

  describe('ichki maydonlar sizib chiqmaydi', () => {
    it('ommaviy javobda deletedAt, updatedAt va obyekt kaliti yoq', async () => {
      const res = await publicProduct().expect(200);
      const body = JSON.stringify(res.body);

      for (const field of ['deletedAt', 'updatedAt', 'createdAt', 'isActive', 'categoryId']) {
        expect(body, field).not.toContain(field);
      }
    });

    it('kategoriya ichki id sini oshkor qilmaydi', async () => {
      const res = await request(app.getHttpServer()).get(`${base}/products/categories`).expect(200);
      for (const item of res.body as Record<string, unknown>[]) {
        expect(Object.keys(item)).not.toContain('id');
      }
    });
  });
});
