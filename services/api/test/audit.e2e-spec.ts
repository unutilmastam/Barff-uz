import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { AuditService } from '../src/audit/audit.service';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const ADMIN = { email: `e2e-audit-${STAMP}@barff.uz`, password: 'E2E-Audit-Parol-2026' };
const SALES = { email: `e2e-audit-sales-${STAMP}@barff.uz`, password: 'E2E-AuditSales-2026' };

const L = (text: string) => ({ uz: text, ru: text, en: text });

async function makeUser(email: string, password: string, roleCode: string): Promise<string> {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const user = await prisma.user.create({
    data: {
      email,
      fullName: `E2E ${roleCode}`,
      passwordHash: await new PasswordService().hash(password),
      roles: { create: { roleId: role.id } },
    },
  });
  return user.id;
}

describe('Audit jurnali (e2e)', () => {
  let app: INestApplication;
  let audit: AuditService;
  let adminToken = '';
  let salesToken = '';
  let adminId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  const today = new Date().toISOString().slice(0, 10);

  const get = (path: string, token = adminToken) =>
    request(app.getHttpServer()).get(`${base}${path}`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
    audit = app.get(AuditService);

    adminId = await makeUser(ADMIN.email, ADMIN.password, 'ADMIN');
    await makeUser(SALES.email, SALES.password, 'SALES');

    const login = async (c: { email: string; password: string }) =>
      (await request(app.getHttpServer()).post(`${base}/auth/login`).send(c)).body
        .accessToken as string;
    adminToken = await login(ADMIN);
    salesToken = await login(SALES);

    categoryId = (
      await prisma.productCategory.create({ data: { slug: `e2e-audit-${STAMP}`, name: L('E2E') } })
    ).id;

    // Haqiqiy amallar: jurnalga ADMIN nomidan mahsulot, variant va narx yoziladi.
    const created = await request(app.getHttpServer())
      .post(`${base}/admin/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: `e2e-audit-${STAMP}`, sku: `E2E-AUD-${STAMP}`, categoryId, name: L('Audit') })
      .expect(201);
    productId = created.body.id;

    const variant = await request(app.getHttpServer())
      .post(`${base}/admin/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `E2E-AUD-${STAMP}-1`, volumeMl: 500 })
      .expect(201);
    variantId = variant.body.id;

    for (const amount of [1_200_000, 1_350_000]) {
      await request(app.getHttpServer())
        .post(`${base}/admin/products/variants/${variantId}/prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount })
        .expect(201);
    }
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorEmail: { in: [ADMIN.email, SALES.email] } }, { entityId: variantId }] },
    });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.productCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN.email, SALES.email] } } });
    await prisma.$disconnect();
    await app?.close();
  });

  describe('ruxsatlar', () => {
    it('tokensiz 401', async () => {
      await request(app.getHttpServer()).get(`${base}/admin/audit`).expect(401);
    });

    it('audit.view ruxsatisiz rol (SALES) ro‘yxat, eksport va tafsilotni KO‘RA OLMAYDI', async () => {
      await get('/admin/audit', salesToken).expect(403);
      await get('/admin/audit/facets', salesToken).expect(403);
      await get('/admin/audit/export.csv', salesToken).expect(403);
      await get('/admin/audit/00000000-0000-4000-8000-000000000000', salesToken).expect(403);
    });
  });

  describe('o‘qish va filtrlar', () => {
    it('§23 narx o‘zgarishi: oldingi va yangi narx, kim qilgani bilan', async () => {
      const res = await get(
        `/admin/audit?action=product.price.changed&entityId=${variantId}&limit=10`,
      ).expect(200);

      expect(res.body.items).toHaveLength(2);
      // Eng yangisi birinchi: 1 200 000 -> 1 350 000.
      const [latest, first] = res.body.items;
      expect(latest.before).toMatchObject({ amount: 1_200_000 });
      expect(latest.after).toMatchObject({ amount: 1_350_000 });
      expect(first.before).toBeNull();
      expect(first.after).toMatchObject({ amount: 1_200_000 });
      expect(latest.actorEmail).toBe(ADMIN.email);
      expect(latest.actorId).toBe(adminId);
    });

    it('variant yaratilishi ham jurnalda', async () => {
      const res = await get(
        `/admin/audit?action=product.variant.created&entityId=${variantId}`,
      ).expect(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.items[0].after).toMatchObject({ sku: `E2E-AUD-${STAMP}-1`, volumeMl: 500 });
    });

    it('actionPrefix soha bo‘yicha: `product` -> product.* amallar', async () => {
      const res = await get(
        `/admin/audit?actionPrefix=product&actor=${encodeURIComponent(ADMIN.email)}&limit=100`,
      ).expect(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(4);
      for (const row of res.body.items) expect(row.action.startsWith('product.')).toBe(true);
    });

    it('bajaruvchi emaili bo‘yicha qidiruv katta-kichik harfga bog‘liq emas', async () => {
      const res = await get(
        `/admin/audit?actor=${encodeURIComponent(ADMIN.email.toUpperCase())}&limit=100`,
      ).expect(200);
      expect(res.body.meta.total).toBeGreaterThan(0);
      for (const row of res.body.items) expect(row.actorEmail).toBe(ADMIN.email);
    });

    it('sana oralig‘i: bugun — bor, kechagi kun — yo‘q', async () => {
      const q = `entityId=${variantId}`;
      const inToday = await get(`/admin/audit?${q}&from=${today}&to=${today}`).expect(200);
      expect(inToday.body.meta.total).toBeGreaterThan(0);

      const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
      const past = await get(`/admin/audit?${q}&from=${yesterday}&to=${yesterday}`).expect(200);
      expect(past.body.meta.total).toBe(0);
    });

    it('yaroqsiz sana va teskari oraliq — 400 (500 emas)', async () => {
      await get('/admin/audit?from=2031-02-31').expect(400);
      await get('/admin/audit?from=2026-12-02&to=2026-12-01').expect(400);
      await get('/admin/audit?limit=1000').expect(400);
      await get('/admin/audit?actorId=ali').expect(400);
    });

    it('sahifalash: limit va page yig‘indisi total ga teng, takror yo‘q', async () => {
      const q = `actor=${encodeURIComponent(ADMIN.email)}`;
      const all = await get(`/admin/audit?${q}&limit=100`).expect(200);
      const total = all.body.meta.total as number;
      expect(total).toBeGreaterThanOrEqual(4);

      const seen = new Set<string>();
      for (let page = 1; page <= Math.ceil(total / 2); page += 1) {
        const res = await get(`/admin/audit?${q}&limit=2&page=${page}`).expect(200);
        for (const row of res.body.items) seen.add(row.id);
      }
      expect(seen.size).toBe(total);
    });

    it('facets: jurnalda uchragan amallar ro‘yxati', async () => {
      const res = await get('/admin/audit/facets').expect(200);
      expect(res.body.actions).toContain('product.price.changed');
      expect(res.body.entities).toContain('ProductVariant');
    });

    it('tafsilot: id bo‘yicha; noma’lum — 404; uuid emas — 400', async () => {
      const list = await get(`/admin/audit?entityId=${variantId}&limit=1`).expect(200);
      const id = list.body.items[0].id as string;

      const one = await get(`/admin/audit/${id}`).expect(200);
      expect(one.body.id).toBe(id);

      await get('/admin/audit/00000000-0000-4000-8000-000000000000').expect(404);
      await get('/admin/audit/emas').expect(400);
    });
  });

  describe('CSV eksport', () => {
    it('BOM, sarlavha, filtr bo‘yicha qatorlar; eksportning o‘zi ham jurnalga yoziladi', async () => {
      const res = await get(`/admin/audit/export.csv?entityId=${variantId}`).expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('audit.csv');

      const body = res.text;
      expect(body.startsWith('﻿"Vaqt (UTC)"')).toBe(true);
      // sarlavha + variant yaratilishi + 2 ta narx = 4 qator
      expect(body.trim().split('\r\n')).toHaveLength(4);
      expect(body).toContain('product.price.changed');
      expect(body).toContain(ADMIN.email);

      const exported = await prisma.auditLog.findMany({
        where: { action: 'audit.exported', actorEmail: ADMIN.email },
      });
      expect(exported.length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(exported[0]?.after)).toContain(variantId);
    });

    it('filtr xatosi eksportda ham 400', async () => {
      await get('/admin/audit/export.csv?from=2031-02-31').expect(400);
    });
  });

  describe('sirlar jurnalga TUSHMAYDI (DoD)', () => {
    const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';

    it('parol, xesh, token — kalit va qiymat bo‘yicha yashiriladi', async () => {
      const entityId = `secret-probe-${STAMP}`;

      await audit.record({
        action: 'e2e.secret.probe',
        entity: 'probe',
        entityId,
        actorEmail: ADMIN.email,
        before: {
          password: 'Maxfiy-1',
          passwordHash: '$argon2id$v=19$m=1$abc$def',
          mfaSecret: 'S',
        },
        after: { note: JWT, nested: { refreshToken: 'r', apiKey: 'k' }, ok: 'oddiy matn' },
      });

      const row = await prisma.auditLog.findFirstOrThrow({ where: { entityId } });
      const dump = JSON.stringify([row.before, row.after]);

      expect(dump).not.toContain('Maxfiy-1');
      expect(dump).not.toContain('argon2');
      expect(dump).not.toContain(JWT);
      expect(dump).not.toContain('"S"');
      expect(dump).toContain('oddiy matn');
    });

    it('JADVALNING HAMMA qatorlarida (haqiqiy oqimlardan) sir izi yo‘q', async () => {
      // Kirish, noto'g'ri parol bilan kirish va rol o'zgarishi allaqachon jurnalda.
      await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: ADMIN.email, password: 'NOTOGRI-parol-1' })
        .expect(401);

      const rows = await prisma.auditLog.findMany({
        select: { action: true, before: true, after: true, userAgent: true },
      });
      expect(rows.length).toBeGreaterThan(0);

      const KEY = /password|passwd|token|secret|hash|authorization|cookie|apikey|privatekey/i;
      const VALUE = /\$argon2|eyJ[\w-]+\.[\w-]+\.[\w-]+/;

      const offenders: string[] = [];
      const walk = (value: unknown, action: string): void => {
        if (typeof value === 'string' && VALUE.test(value)) offenders.push(`${action}: qiymat`);
        if (value === null || typeof value !== 'object') return;
        for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
          // `[REDACTED]` — to'g'ri natija: kalit bor, qiymat yashirilgan.
          if (KEY.test(key) && inner !== '[REDACTED]') offenders.push(`${action}: kalit ${key}`);
          walk(inner, action);
        }
      };

      for (const row of rows) {
        walk(row.before, row.action);
        walk(row.after, row.action);
      }

      expect(offenders).toEqual([]);
    });
  });

  describe('jurnal tahrirlanmaydi', () => {
    it('amalni o‘zgartirishga urinish bazada rad etiladi', async () => {
      const row = await prisma.auditLog.findFirstOrThrow({ where: { actorEmail: ADMIN.email } });

      await expect(
        prisma.$executeRaw`UPDATE "audit_logs" SET "action" = 'soxta' WHERE "id" = ${row.id}::uuid`,
      ).rejects.toThrow(/tahrirlanmaydi/);

      await expect(
        prisma.$executeRaw`UPDATE "audit_logs" SET "after" = '{}'::jsonb WHERE "id" = ${row.id}::uuid`,
      ).rejects.toThrow(/tahrirlanmaydi/);

      const after = await prisma.auditLog.findUniqueOrThrow({ where: { id: row.id } });
      expect(after.action).toBe(row.action);
    });

    it('bajaruvchini boshqasiga almashtirib bo‘lmaydi (faqat NULL ga — foydalanuvchi o‘chganda)', async () => {
      const row = await prisma.auditLog.findFirstOrThrow({ where: { actorEmail: ADMIN.email } });

      await expect(
        prisma.$executeRaw`UPDATE "audit_logs" SET "actorId" = ${row.id}::uuid WHERE "id" = ${row.id}::uuid`,
      ).rejects.toThrow();
    });

    it('foydalanuvchi o‘chirilsa qator QOLADI: actorId NULL, email saqlanadi', async () => {
      const email = `e2e-audit-gone-${STAMP}@barff.uz`;
      const userId = await makeUser(email, 'E2E-Gone-Parol-2026', 'SALES');
      const entityId = `gone-probe-${STAMP}`;

      await audit.record({
        action: 'e2e.gone.probe',
        entity: 'probe',
        entityId,
        actorId: userId,
        actorEmail: email,
      });

      await prisma.user.delete({ where: { id: userId } });

      const row = await prisma.auditLog.findFirstOrThrow({ where: { entityId } });
      expect(row.actorId).toBeNull();
      expect(row.actorEmail).toBe(email);

      await prisma.auditLog.delete({ where: { id: row.id } });
    });
  });
});
