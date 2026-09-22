import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { AUDIT_ACTIONS } from '../src/audit/audit.actions';
import { PasswordService } from '../src/auth/password.service';
import { RedisService } from '../src/redis/redis.service';
import { UserRolesService } from '../src/users/user-roles.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const USER = { email: 'e2e-role@barff.uz', password: 'E2E-Role-Parol-2026' };
const ACTOR = { id: '', email: 'e2e-role-actor@barff.uz' };
const CTX = { ip: '127.0.0.1', userAgent: 'vitest', requestId: 'test-request-id-0001' };

describe('Rol ozgarishi (e2e)', () => {
  let app: INestApplication;
  let userId: string;
  let roles: UserRolesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    roles = app.get(UserRolesService);

    const passwords = new PasswordService();
    const driverRole = await prisma.role.findUniqueOrThrow({ where: { code: 'DRIVER' } });

    await prisma.user.deleteMany({ where: { email: { in: [USER.email, ACTOR.email] } } });

    const created = await prisma.user.create({
      data: {
        email: USER.email,
        fullName: 'E2E Role',
        passwordHash: await passwords.hash(USER.password),
        roles: { create: { roleId: driverRole.id } },
      },
    });
    userId = created.id;

    const actor = await prisma.user.create({
      data: {
        email: ACTOR.email,
        fullName: 'E2E Actor',
        passwordHash: await passwords.hash('Actor-Parol-2026'),
      },
    });
    ACTOR.id = actor.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [userId, ACTOR.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: [USER.email, ACTOR.email] } } });
    await prisma.$disconnect();
    await app?.close();
  });

  /** Testlar ketma-ketligida urinish hisoblagichi to'planib qolmasligi uchun. */
  const resetCounters = async (): Promise<void> => {
    const redis = app.get(RedisService);
    await redis.client.del(`auth:fail:email:${USER.email}`);
    for (const ip of ['::ffff:127.0.0.1', '::1', '127.0.0.1']) {
      await redis.client.del(`auth:fail:ip:${ip}`);
    }
  };

  const me = (token: string) =>
    request(app.getHttpServer()).get(`${base}/auth/me`).set('Authorization', `Bearer ${token}`);

  it('rol ozgarishi KESHNI kutmasdan darhol kuchga kiradi', async () => {
    await resetCounters();
    const login = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send(USER)
      .expect(200);

    const token = login.body.accessToken as string;

    // Boshlang'ich holat: haydovchi, ombor ruxsati yo'q.
    const before = await me(token).expect(200);
    expect(before.body.roles).toEqual(['DRIVER']);
    expect(before.body.permissions).not.toContain('stock.adjust');

    await roles.setRoles(userId, ['WAREHOUSE'], ACTOR, CTX);

    // AYNAN SHU access token bilan — yangi huquqlar darhol ko'rinishi kerak,
    // chunki ruxsatlar token ichidan emas, bazadan o'qiladi.
    const after = await me(token).expect(200);
    expect(after.body.roles).toEqual(['WAREHOUSE']);
    expect(after.body.permissions).toContain('stock.adjust');
  });

  it('rol ozgarishi audit jurnaliga before/after bilan tushadi', async () => {
    await roles.setRoles(userId, ['SALES'], ACTOR, CTX);

    const entry = await prisma.auditLog.findFirst({
      where: { entityId: userId, action: AUDIT_ACTIONS.ROLE_CHANGED },
      orderBy: { createdAt: 'desc' },
    });

    expect(entry?.actorId).toBe(ACTOR.id);
    expect(entry?.actorEmail).toBe(ACTOR.email);
    expect(entry?.before).toEqual({ roles: ['WAREHOUSE'] });
    expect(entry?.after).toEqual({ roles: ['SALES'] });
    expect(entry?.requestId).toBe(CTX.requestId);
  });

  it("noma'lum rolni rad etadi", async () => {
    await expect(roles.setRoles(userId, ['YOQ_BUNDAY_ROL' as never], ACTOR, CTX)).rejects.toThrow();
  });

  it('bloklangan foydalanuvchi amaldagi token bilan ham kira olmaydi', async () => {
    await resetCounters();
    const login = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send(USER)
      .expect(200);

    const token = login.body.accessToken as string;
    await me(token).expect(200);

    await roles.deactivate(userId, ACTOR, CTX);

    const res = await me(token).expect(401);
    expect(res.body.code).toBe('ACCOUNT_INACTIVE');

    // Refresh token ham bekor qilingan bo'lishi kerak.
    await request(app.getHttpServer())
      .post(`${base}/auth/refresh`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });
});
