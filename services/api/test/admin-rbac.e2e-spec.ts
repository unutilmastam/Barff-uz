import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

/**
 * Admin panel endpoint'lari ROLGA qarab qo'riqlanadimi (CLAUDE.md §3).
 *
 * NEGA bu alohida to'plam: admin ilovasi menyuni rolga qarab yashiradi,
 * lekin menyuni yashirish HIMOYA EMAS. Foydalanuvchi manzilni qo'lda
 * yozishi yoki API'ni to'g'ridan-to'g'ri chaqirishi mumkin. Shuning
 * uchun bu yerda AYNAN shunday qilinadi: token bilan, lekin ruxsatsiz
 * rol bilan har bir admin endpoint chaqiriladi va `403` kutiladi.
 */
const USERS = {
  driver: { email: 'e2e-rbac-driver@barff.uz', password: 'E2E-Rbac-Driver-2026', role: 'DRIVER' },
  sales: { email: 'e2e-rbac-sales@barff.uz', password: 'E2E-Rbac-Sales-2026', role: 'SALES' },
  admin: { email: 'e2e-rbac-admin@barff.uz', password: 'E2E-Rbac-Admin-2026', role: 'ADMIN' },
};

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

describe('Admin RBAC (e2e)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    for (const [key, user] of Object.entries(USERS)) {
      await makeUser(user.email, user.password, user.role);

      const login = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: user.email, password: user.password });

      tokens[key] = login.body.accessToken as string;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(USERS).map((user) => user.email) } },
    });
    await prisma.$disconnect();
    await app?.close();
  });

  /** Admin panel menyusidagi har bir bo'lim ortidagi endpoint. */
  const endpoints = [
    { path: '/admin/content/news', permission: 'content.view' },
    { path: '/admin/content/certificates', permission: 'content.view' },
    { path: '/admin/content/gallery', permission: 'content.view' },
    { path: '/admin/content/documents', permission: 'content.view' },
    { path: '/admin/content/seo', permission: 'content.view' },
    { path: '/admin/content/settings', permission: 'settings.manage' },
    { path: '/admin/products', permission: 'products.view' },
    { path: '/admin/leads', permission: 'leads.view' },
    { path: '/media', permission: 'content.view' },
  ];

  describe('RUXSATSIZ rol', () => {
    it.each(endpoints)('DRIVER $path uchun 403 oladi', async ({ path }) => {
      await request(app.getHttpServer())
        .get(`${base}${path}`)
        .set('Authorization', `Bearer ${tokens['driver']}`)
        .expect(403);
    });

    it('TOKENSIZ sorov 401 oladi', async () => {
      await request(app.getHttpServer()).get(`${base}/admin/leads`).expect(401);
    });

    it('soxta token bilan ham 401 — imzo tekshiriladi', async () => {
      await request(app.getHttpServer())
        .get(`${base}/admin/leads`)
        .set('Authorization', 'Bearer soxta.token.qiymati')
        .expect(401);
    });
  });

  describe('QISMAN ruxsatli rol', () => {
    it('SALES arizalarni KORADI', async () => {
      await request(app.getHttpServer())
        .get(`${base}/admin/leads`)
        .set('Authorization', `Bearer ${tokens['sales']}`)
        .expect(200);
    });

    it('SALES tizim sozlamalarini KORA OLMAYDI', async () => {
      // Menyuda bu bo'lim ko'rinmaydi, lekin asosiy himoya shu yerda.
      await request(app.getHttpServer())
        .get(`${base}/admin/content/settings`)
        .set('Authorization', `Bearer ${tokens['sales']}`)
        .expect(403);
    });

    it('SALES kontent YARATA olmaydi (yozish ruxsati alohida)', async () => {
      await request(app.getHttpServer())
        .post(`${base}/admin/content/news`)
        .set('Authorization', `Bearer ${tokens['sales']}`)
        .send({
          slug: 'e2e-rbac',
          title: { uz: 'X', ru: 'X', en: 'X' },
          body: { uz: 'X', ru: 'X', en: 'X' },
        })
        .expect(403);
    });
  });

  describe('TOLIQ ruxsatli rol', () => {
    it.each(endpoints)('ADMIN $path ni ochadi', async ({ path }) => {
      await request(app.getHttpServer())
        .get(`${base}${path}`)
        .set('Authorization', `Bearer ${tokens['admin']}`)
        .expect(200);
    });
  });
});
