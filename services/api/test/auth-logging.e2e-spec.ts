import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { AUDIT_ACTIONS } from '../src/audit/audit.actions';
import { PasswordService } from '../src/auth/password.service';
import { JsonLogger } from '../src/common/logger/json.logger';
import { RedisService } from '../src/redis/redis.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const USER = { email: 'e2e-log@barff.uz', password: 'E2E-Log-Parol-2026' };

/**
 * DoD: parol va token HECH QAYERDA loglanmaydi (CLAUDE.md §12, §23).
 *
 * Tekshiruv ikki qatlamda: chiqish oqimlari (stdout/stderr) va audit
 * jurnalidagi yozuvlar.
 */
describe('Auth logging (e2e)', () => {
  let app: INestApplication;
  let captured: string[] = [];
  const originalOut = process.stdout.write.bind(process.stdout);
  const originalErr = process.stderr.write.bind(process.stderr);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    const passwords = new PasswordService();
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SALES' } });

    await prisma.user.deleteMany({ where: { email: USER.email } });
    await prisma.user.create({
      data: {
        email: USER.email,
        fullName: 'E2E Log',
        passwordHash: await passwords.hash(USER.password),
        roles: { create: { roleId: role.id } },
      },
    });
  });

  afterEach(() => {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
    captured = [];
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorEmail: USER.email } });
    await prisma.user.deleteMany({ where: { email: USER.email } });
    await prisma.$disconnect();
    await app?.close();
  });

  /** Boshqa testlar qoldirgan urinish hisoblagichlari aralashmasligi uchun. */
  async function resetCounters(): Promise<void> {
    const redis = app.get(RedisService);
    await redis.client.del(`auth:fail:email:${USER.email}`);
    for (const ip of ['::ffff:127.0.0.1', '::1', '127.0.0.1']) {
      await redis.client.del(`auth:fail:ip:${ip}`);
    }
  }

  function captureOutput(): void {
    const sink = (chunk: unknown): boolean => {
      captured.push(String(chunk));
      return true;
    };
    process.stdout.write = sink as typeof process.stdout.write;
    process.stderr.write = sink as typeof process.stderr.write;
  }

  it('muvaffaqiyatli kirishda parol ham, token ham oqimga tushmaydi', async () => {
    await resetCounters();
    captureOutput();
    const res = await request(app.getHttpServer()).post(`${base}/auth/login`).send(USER);
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;

    const output = captured.join('');

    expect(res.status).toBe(200);
    expect(output).not.toContain(USER.password);
    expect(output).not.toContain(res.body.accessToken);
    expect(output).not.toContain(res.body.refreshToken);
  });

  it("noto'g'ri parolda ham parol oqimga tushmaydi", async () => {
    captureOutput();
    await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: USER.email, password: 'MAXFIY-NOTOGRI-PAROL' });
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;

    expect(captured.join('')).not.toContain('MAXFIY-NOTOGRI-PAROL');
  });

  it('JsonLogger parol maydonini yashiradi', () => {
    captureOutput();
    new JsonLogger('debug').log({ email: USER.email, password: 'OCHIQ-PAROL' } as never);
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;

    const output = captured.join('');
    expect(output).not.toContain('OCHIQ-PAROL');
    expect(output).toContain('[REDACTED]');
  });

  it('audit jurnalida kirish qayd etiladi, parol esa yozilmaydi', async () => {
    await resetCounters();
    await request(app.getHttpServer()).post(`${base}/auth/login`).send(USER).expect(200);

    const entry = await prisma.auditLog.findFirst({
      where: { actorEmail: USER.email, action: AUDIT_ACTIONS.LOGIN_SUCCESS },
      orderBy: { createdAt: 'desc' },
    });

    expect(entry).not.toBeNull();
    expect(entry?.ip).not.toBeNull();
    expect(JSON.stringify(entry)).not.toContain(USER.password);
  });

  it("noto'g'ri parol audit jurnaliga urinish sifatida tushadi", async () => {
    await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: USER.email, password: 'yana-notogri' })
      .expect(401);

    const entry = await prisma.auditLog.findFirst({
      where: { actorEmail: USER.email, action: AUDIT_ACTIONS.LOGIN_FAILED },
      orderBy: { createdAt: 'desc' },
    });

    expect(entry).not.toBeNull();
    expect(JSON.stringify(entry?.after)).not.toContain('yana-notogri');
  });
});
