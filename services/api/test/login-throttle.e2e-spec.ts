import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { AppConfig } from '../src/config/app.config';
import { LoginAttemptService } from '../src/auth/login-attempt.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const USER = { email: 'e2e-throttle@barff.uz', password: 'E2E-Throttle-Parol-2026' };

/**
 * Kirish urinishlarini cheklash.
 *
 * Bu S02 dagi umumiy rate limiter'dan ALOHIDA: u so'rovlar sonini cheklaydi,
 * bu esa faqat muvaffaqiyatsiz kirishlarni hisoblaydi.
 */
describe('Login throttling (e2e)', () => {
  let app: INestApplication;
  /*
    Hisoblagich XOTIRASIGA to'g'ridan-to'g'ri tegilmaydi.

    Avval test Redis kalitlarini o'zi o'chirardi. Xotira PostgreSQL ga
    ko'chgach o'sha kalitlar hech narsani tozalamay qo'ydi va
    hisoblagich yurgizishlar orasida to'planib, test birinchi
    urinishdayoq `403` ola boshladi. Endi tozalash SERVIS orqali —
    test qayerda saqlanishini bilmaydi.
  */
  let attempts: LoginAttemptService;
  /**
   * Limit MUHIT O'ZGARUVCHISIDAN emas, ilovaning o'zidan o'qiladi.
   * `ConfigModule` qiymatlarni modul import qilinganda keshlaydi, ya'ni
   * `beforeAll` ichida o'zgartirish kech bo'lardi.
   */
  let maxAttempts: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    attempts = app.get(LoginAttemptService);
    maxAttempts = app.get(AppConfig).loginThrottle.maxAttempts;

    const passwords = new PasswordService();
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SALES' } });

    await prisma.user.deleteMany({ where: { email: USER.email } });
    await prisma.user.create({
      data: {
        email: USER.email,
        fullName: 'E2E Throttle',
        passwordHash: await passwords.hash(USER.password),
        roles: { create: { roleId: role.id } },
      },
    });
  });

  afterAll(async () => {
    await attempts.reset(USER.email, '127.0.0.1');
    await prisma.auditLog.deleteMany({ where: { actorEmail: USER.email } });
    await prisma.user.deleteMany({ where: { email: USER.email } });
    await prisma.$disconnect();
    await app?.close();
  });

  /** Boshqa test fayllari qoldirgan hisoblagichlar aralashmasligi uchun. */
  const resetCounters = async (): Promise<void> => {
    // IP bir nechta ko'rinishda kelishi mumkin (IPv4, IPv6, mapped).
    for (const ip of ['::ffff:127.0.0.1', '::1', '127.0.0.1']) {
      await attempts.reset(USER.email, ip);
    }
  };

  it('limitdan keyin togri parol bilan ham kiritmaydi', async () => {
    await resetCounters();

    for (let i = 0; i < maxAttempts; i += 1) {
      await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: USER.email, password: 'notogri' })
        .expect(401);
    }

    // Limit to'lgandan keyin TO'G'RI parol ham o'tmasligi kerak — aks holda
    // cheklash parol tanlashni sekinlashtirmagan bo'lardi.
    const res = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send(USER)
      .expect(403);

    expect(res.body.code).toBe('LOGIN_LOCKED');
  });

  it('muvaffaqiyatli kirish hisoblagichni tozalaydi', async () => {
    await resetCounters();

    await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: USER.email, password: 'notogri' })
      .expect(401);

    await request(app.getHttpServer()).post(`${base}/auth/login`).send(USER).expect(200);

    expect(await attempts.isLocked(USER.email, '127.0.0.1')).toBe(false);
  });
});
