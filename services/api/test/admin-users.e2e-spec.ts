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
const stamp = Date.now();

const ADMIN = { email: `e2e-users-admin-${stamp}@barff.uz`, password: 'E2E-Users-Admin-2026' };
const SALES = { email: `e2e-users-sales-${stamp}@barff.uz`, password: 'E2E-Users-Sales-2026' };
const DEALER_EMAIL = `e2e-users-dealer-${stamp}@barff.uz`;
const NEW_STAFF = {
  email: `e2e-users-new-${stamp}@barff.uz`,
  fullName: 'Yangi Xodim',
  password: 'Yangi-Xodim-Parol-2026',
  roles: ['WAREHOUSE'],
};

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

describe('Admin users (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let adminId = '';
  let salesToken = '';
  let dealerId = '';
  let newId = '';
  const emails = [ADMIN.email, SALES.email, DEALER_EMAIL, NEW_STAFF.email];

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post(`${base}/auth/login`).send({ email, password });

  const as = (token: string) => ({
    get: (path: string) =>
      request(app.getHttpServer()).get(`${base}${path}`).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) =>
      request(app.getHttpServer())
        .post(`${base}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    patch: (path: string, body: object) =>
      request(app.getHttpServer())
        .patch(`${base}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    put: (path: string, body: object) =>
      request(app.getHttpServer())
        .put(`${base}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    adminId = await makeUser(ADMIN.email, ADMIN.password, 'ADMIN');
    await makeUser(SALES.email, SALES.password, 'SALES');
    dealerId = await makeUser(DEALER_EMAIL, 'E2E-Dealer-Parol-2026', 'DEALER');

    adminToken = (await login(ADMIN.email, ADMIN.password)).body.accessToken;
    salesToken = (await login(SALES.email, SALES.password)).body.accessToken;
  });

  afterAll(async () => {
    const ids = (await prisma.user.findMany({ where: { email: { in: emails } } })).map((u) => u.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ entityId: { in: ids } }, { actorId: { in: ids } }] },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    await app?.close();
  });

  describe('avtorizatsiya', () => {
    it('tokensiz 401, ruxsatsiz rol (SALES) 403', async () => {
      await request(app.getHttpServer()).get(`${base}/admin/users`).expect(401);
      await as(salesToken).get('/admin/users').expect(403);
      await as(salesToken).get('/admin/roles').expect(403);
      await as(salesToken).post('/admin/users', NEW_STAFF).expect(403);
    });
  });

  describe('yaratish', () => {
    it('xodim yaratadi; javobda hash YO‘Q; yangi xodim kira oladi; audit parolsiz', async () => {
      const res = await as(adminToken).post('/admin/users', NEW_STAFF).expect(201);
      newId = res.body.id;

      expect(res.body.roles).toEqual(['WAREHOUSE']);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|mfaSecret/);

      await login(NEW_STAFF.email, NEW_STAFF.password).expect(200);

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: newId, action: 'user.created' },
      });
      expect(audit).not.toBeNull();
      expect(JSON.stringify(audit)).not.toContain(NEW_STAFF.password);
    });

    it('takroriy email 409, qisqa parol 400, DEALER/noma‘lum rol 400', async () => {
      const dup = await as(adminToken).post('/admin/users', NEW_STAFF).expect(409);
      expect(dup.body.code).toBe('DUPLICATE_VALUE');

      await as(adminToken)
        .post('/admin/users', { ...NEW_STAFF, email: `x-${stamp}@barff.uz`, password: 'qisqa' })
        .expect(400);
      await as(adminToken)
        .post('/admin/users', { ...NEW_STAFF, email: `y-${stamp}@barff.uz`, roles: ['DEALER'] })
        .expect(400);
      await as(adminToken)
        .post('/admin/users', { ...NEW_STAFF, email: `z-${stamp}@barff.uz`, roles: [] })
        .expect(400);
    });
  });

  describe('ro‘yxat va dilerlar', () => {
    it('ro‘yxatda xodim bor, diler akkaunti YO‘Q, hash chiqmaydi', async () => {
      const res = await as(adminToken).get('/admin/users?limit=100').expect(200);
      const ids = res.body.items.map((u: { id: string }) => u.id);

      expect(ids).toContain(newId);
      expect(ids).not.toContain(dealerId);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    });

    it('diler akkauntini bu yerda o‘zgartirib bo‘lmaydi (404)', async () => {
      await as(adminToken).patch(`/admin/users/${dealerId}`, { isActive: false }).expect(404);
      await as(adminToken)
        .put(`/admin/users/${dealerId}/roles`, { roles: ['ADMIN'] })
        .expect(404);
      await as(adminToken)
        .post(`/admin/users/${dealerId}/password`, { password: 'Yangi-Parol-2026-x' })
        .expect(404);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: dealerId } })).isActive).toBe(
        true,
      );
    });

    it('rollar ro‘yxati faqat xodim rollari', async () => {
      const res = await as(adminToken).get('/admin/roles').expect(200);
      const codes = res.body.map((r: { code: string }) => r.code);

      expect(codes).toEqual(expect.arrayContaining(['ADMIN', 'SALES', 'DRIVER']));
      expect(codes).not.toContain('DEALER');
    });
  });

  describe('bloklash, rol, parol', () => {
    it('bloklangan xodim kira olmaydi va eski tokeni ishlamaydi; ochilgach kiradi', async () => {
      const session = await login(NEW_STAFF.email, NEW_STAFF.password).expect(200);
      const staffToken = session.body.accessToken as string;
      const refreshToken = session.body.refreshToken as string;

      await as(adminToken).patch(`/admin/users/${newId}`, { isActive: false }).expect(200);

      const lg = await login(NEW_STAFF.email, NEW_STAFF.password).expect(403);
      expect(lg.body.code).toBe('ACCOUNT_INACTIVE');
      await as(staffToken).get('/warehouse/stock').expect(401);
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken })
        .expect(401);

      await as(adminToken).patch(`/admin/users/${newId}`, { isActive: true }).expect(200);
      await login(NEW_STAFF.email, NEW_STAFF.password).expect(200);
    });

    it('rol almashganda huquq DARHOL o‘zgaradi', async () => {
      const before = await login(NEW_STAFF.email, NEW_STAFF.password).expect(200);
      await as(before.body.accessToken).get('/warehouse/stock').expect(200);

      const res = await as(adminToken)
        .put(`/admin/users/${newId}/roles`, { roles: ['DRIVER'] })
        .expect(200);
      expect(res.body.roles).toEqual(['DRIVER']);

      // Eski token endi omborni ocha olmaydi (kesh bekor qilingan).
      await as(before.body.accessToken).get('/warehouse/stock').expect(403);
    });

    it('parol yangilanadi: eskisi ishlamaydi, sessiyalar bekor, audit parolsiz', async () => {
      const session = await login(NEW_STAFF.email, NEW_STAFF.password).expect(200);
      const newPassword = 'Butunlay-Yangi-Parol-2026';

      await as(adminToken)
        .post(`/admin/users/${newId}/password`, { password: newPassword })
        .expect(204);

      await login(NEW_STAFF.email, NEW_STAFF.password).expect(401);
      await login(NEW_STAFF.email, newPassword).expect(200);
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: session.body.refreshToken })
        .expect(401);

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: newId, action: 'user.password.reset' },
      });
      expect(audit).not.toBeNull();
      expect(JSON.stringify(audit)).not.toContain(newPassword);

      await as(adminToken)
        .post(`/admin/users/${newId}/password`, { password: 'qisqa' })
        .expect(400);
    });
  });

  describe('lockout himoyasi', () => {
    it('o‘zini bloklab va admin rolidan mahrum qilib bo‘lmaydi', async () => {
      const blocked = await as(adminToken)
        .patch(`/admin/users/${adminId}`, { isActive: false })
        .expect(409);
      expect(blocked.body.code).toBe('CANNOT_DEACTIVATE_SELF');

      const demoted = await as(adminToken)
        .put(`/admin/users/${adminId}/roles`, { roles: ['SALES'] })
        .expect(409);
      expect(demoted.body.code).toBe('CANNOT_DEMOTE_SELF');

      expect((await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).isActive).toBe(true);
    });
  });
});
