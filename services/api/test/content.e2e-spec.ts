import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentStatus, MediaVisibility, PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;
const L = (t: string) => ({ uz: t, ru: t, en: t });

const ADMIN = { email: 'e2e-content@barff.uz', password: 'E2E-Content-Parol-2026' };
const DRIVER = { email: 'e2e-content-drv@barff.uz', password: 'E2E-ContentDrv-2026' };

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

describe('Content (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let driverToken = '';
  let mediaId = '';
  const prefix = `e2e-c-${Date.now()}`;
  const cleanupSlugs: string[] = [];

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

    const media = await prisma.mediaAsset.create({
      data: {
        key: `private/${prefix}/original.png`,
        originalName: 'e2e.png',
        mimeType: 'image/png',
        byteSize: 100,
        kind: 'IMAGE',
        visibility: MediaVisibility.PRIVATE,
        checksum: prefix,
      },
    });
    mediaId = media.id;
  });

  afterAll(async () => {
    await prisma.newsArticle.deleteMany({ where: { slug: { in: cleanupSlugs } } });
    await prisma.galleryItem.deleteMany({ where: { mediaAssetId: mediaId } });
    await prisma.publicDocument.deleteMany({ where: { mediaAssetId: mediaId } });
    await prisma.certificate.deleteMany({ where: { number: prefix } });
    await prisma.productionStep.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.homepageSection.deleteMany({ where: { key: { startsWith: prefix } } });
    await prisma.seoMetadata.deleteMany({ where: { path: { startsWith: `/${prefix}` } } });
    await prisma.mediaAsset.deleteMany({ where: { id: mediaId } });
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN.email, DRIVER.email] } } });
    await prisma.$disconnect();
    await app?.close();
  });

  const admin = (method: 'post' | 'patch' | 'put' | 'get' | 'delete', path: string) =>
    request(app.getHttpServer())
      [method](`${base}/admin/content${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

  // ===========================================================================
  describe('QORALAMALAR OMMAVIY API DA KO‘RINMAYDI', () => {
    it('qoralama yangilik royxatda yoq va slug boyicha 404', async () => {
      const slug = `${prefix}-qoralama`;
      cleanupSlugs.push(slug);

      const created = await admin('post', '/news')
        .send({ slug, title: L('Qoralama'), body: L('Matn') })
        .expect(201);

      // Standart holat DRAFT bo'lishi shart — nashr alohida qaror.
      expect(created.body.status).toBe(ContentStatus.DRAFT);

      const list = await request(app.getHttpServer()).get(`${base}/news?limit=100`).expect(200);
      expect((list.body.items as { slug: string }[]).map((n) => n.slug)).not.toContain(slug);

      await request(app.getHttpServer()).get(`${base}/news/${slug}`).expect(404);
    });

    it('nashr qilingandan keyin korinadi', async () => {
      const slug = `${prefix}-nashr`;
      cleanupSlugs.push(slug);

      const created = await admin('post', '/news')
        .send({ slug, title: L('Nashr'), body: L('Matn'), status: 'PUBLISHED' })
        .expect(201);

      expect(created.body.status).toBe(ContentStatus.PUBLISHED);
      await request(app.getHttpServer()).get(`${base}/news/${slug}`).expect(200);
    });

    it('KELAJAKDAGI nashr sanasi bilan hali korinmaydi', async () => {
      const slug = `${prefix}-kelajak`;
      cleanupSlugs.push(slug);

      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await admin('post', '/news')
        .send({
          slug,
          title: L('Kelajak'),
          body: L('Matn'),
          status: 'PUBLISHED',
          publishedAt: future.toISOString(),
        })
        .expect(201);

      // Rejalashtirilgan nashr: holat PUBLISHED, lekin sana kelmagan.
      await request(app.getHttpServer()).get(`${base}/news/${slug}`).expect(404);
    });

    it('qoralama sertifikat ommaviy royxatda yoq', async () => {
      const created = await admin('post', '/certificates')
        .send({ title: L('Qoralama sertifikat'), number: prefix })
        .expect(201);

      const list = await request(app.getHttpServer()).get(`${base}/certificates`).expect(200);
      expect((list.body as { id: string }[]).map((c) => c.id)).not.toContain(created.body.id);
    });

    it('qoralama galereya elementi ommaviy royxatda yoq', async () => {
      const created = await admin('post', '/gallery').send({ mediaAssetId: mediaId }).expect(201);

      const list = await request(app.getHttpServer()).get(`${base}/gallery`).expect(200);
      expect((list.body as { id: string }[]).map((g) => g.id)).not.toContain(created.body.id);
    });

    it('qoralama hujjat ommaviy royxatda yoq', async () => {
      const created = await admin('post', '/documents')
        .send({ title: L('Qoralama hujjat'), mediaAssetId: mediaId })
        .expect(201);

      const list = await request(app.getHttpServer()).get(`${base}/documents`).expect(200);
      expect((list.body as { id: string }[]).map((d) => d.id)).not.toContain(created.body.id);
    });

    it('qoralama ishlab chiqarish bosqichi ommaviy royxatda yoq', async () => {
      const slug = `${prefix}-bosqich`;
      await admin('put', `/production-steps/${slug}`)
        .send({ slug, title: L('Qoralama bosqich') })
        .expect(200);

      const list = await request(app.getHttpServer()).get(`${base}/production-steps`).expect(200);
      expect((list.body as { slug: string }[]).map((s) => s.slug)).not.toContain(slug);
    });

    it('qoralama bosh sahifa bolimi ommaviy royxatda yoq', async () => {
      const key = `${prefix}-hero`;
      await admin('put', `/homepage-sections/${key}`)
        .send({ key, heading: L('Qoralama hero') })
        .expect(200);

      const list = await request(app.getHttpServer()).get(`${base}/homepage-sections`).expect(200);
      expect((list.body as { key: string }[]).map((s) => s.key)).not.toContain(key);
    });

    /**
     * Ommaviy javob ichki maydonlarni CHIQARMASLIGI kerak.
     *
     * Eng xavflisi — obyekt saqlashdagi `key`: u bilan fayl manzilini
     * taxmin qilish mumkin. Shu sababli javobda faqat tayyor `url` bo'ladi.
     */
    it('ommaviy kontent javobi ichki maydonlarni chiqarmaydi', async () => {
      const created = await admin('post', '/documents')
        .send({ title: L('Ommaviy hujjat'), mediaAssetId: mediaId, status: 'PUBLISHED' })
        .expect(201);

      const list = await request(app.getHttpServer()).get(`${base}/documents`).expect(200);
      const found = (list.body as { id: string }[]).find((d) => d.id === created.body.id);

      expect(found).toBeDefined();
      const serialized = JSON.stringify(found);

      for (const leaked of ['deletedAt', 'updatedAt', 'createdAt', 'mediaAssetId', '"key"']) {
        expect(serialized).not.toContain(leaked);
      }
      // Fayl manzili bor, lekin obyekt kaliti yo'q.
      expect(found).toMatchObject({ file: { mimeType: 'image/png' } });
    });

    it('ADMIN royxatida qoralamalar KORINADI', async () => {
      const res = await admin('get', '/news?limit=100&status=DRAFT').expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  describe('avtorizatsiya', () => {
    it('tokensiz yaratib bolmaydi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/admin/content/news`)
        .send({ slug: `${prefix}-x`, title: L('X'), body: L('Y') })
        .expect(401);
    });

    it('content.manage ruxsati yoq rol 403 oladi', async () => {
      const res = await request(app.getHttpServer())
        .post(`${base}/admin/content/news`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ slug: `${prefix}-y`, title: L('X'), body: L('Y') })
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN_PERMISSION');
    });

    it('ommaviy endpointlar tokensiz ochiladi', async () => {
      for (const path of [
        '/news',
        '/certificates',
        '/gallery',
        '/documents',
        '/production-steps',
        '/homepage-sections',
      ]) {
        await request(app.getHttpServer()).get(`${base}${path}`).expect(200);
      }
    });
  });

  // ===========================================================================
  describe('validatsiya va CRUD', () => {
    it("noto'g'ri slugni rad etadi", async () => {
      const res = await admin('post', '/news')
        .send({ slug: 'Katta Harf', title: L('X'), body: L('Y') })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('tarjimasi tolmagan sarlavhani rad etadi', async () => {
      await admin('post', '/news')
        .send({ slug: `${prefix}-t`, title: { uz: 'Faqat uz' }, body: L('Y') })
        .expect(400);
    });

    it('takroriy slugni 409 bilan rad etadi', async () => {
      const slug = `${prefix}-takror`;
      cleanupSlugs.push(slug);

      await admin('post', '/news')
        .send({ slug, title: L('A'), body: L('B') })
        .expect(201);
      const res = await admin('post', '/news')
        .send({ slug, title: L('C'), body: L('D') })
        .expect(409);
      expect(res.body.code).toBe('DUPLICATE_VALUE');
    });

    it('yangilikni yangilaydi va ochiradi', async () => {
      const slug = `${prefix}-crud`;
      cleanupSlugs.push(slug);

      const created = await admin('post', '/news')
        .send({ slug, title: L('Asl'), body: L('Matn'), status: 'PUBLISHED' })
        .expect(201);

      await admin('patch', `/news/${created.body.id}`)
        .send({ title: L('Yangilangan') })
        .expect(200);

      const updated = await request(app.getHttpServer()).get(`${base}/news/${slug}`).expect(200);
      expect(updated.body.title.uz).toBe('Yangilangan');

      await admin('delete', `/news/${created.body.id}`).expect(204);
      await request(app.getHttpServer()).get(`${base}/news/${slug}`).expect(404);
    });

    it("SEO yo'li `/` bilan boshlanishi shart", async () => {
      await admin('put', '/seo')
        .send({ path: 'products', title: L('X') })
        .expect(400);
    });

    it('SEO yozuvini saqlaydi va oqiydi', async () => {
      const path = `/${prefix}-sahifa`;
      await admin('put', '/seo')
        .send({ path, title: L('Sarlavha'), description: L('Tavsif') })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${base}/seo?path=${encodeURIComponent(path)}`)
        .expect(200);

      expect(res.body.title.uz).toBe('Sarlavha');
    });

    it('bosqichni qayta saqlaganda nusxa yaratmaydi (upsert)', async () => {
      const slug = `${prefix}-upsert`;

      await admin('put', `/production-steps/${slug}`)
        .send({ slug, title: L('Birinchi'), status: 'PUBLISHED' })
        .expect(200);
      await admin('put', `/production-steps/${slug}`)
        .send({ slug, title: L('Ikkinchi'), status: 'PUBLISHED' })
        .expect(200);

      const list = await request(app.getHttpServer()).get(`${base}/production-steps`).expect(200);
      const matches = (list.body as { slug: string; title: { uz: string } }[]).filter(
        (s) => s.slug === slug,
      );

      expect(matches).toHaveLength(1);
      expect(matches[0]?.title.uz).toBe('Ikkinchi');
    });
  });
});
