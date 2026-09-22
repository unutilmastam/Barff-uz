import { Controller, Get, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/auth/auth.module';
import { Permissions } from '../src/auth/decorators/permissions.decorator';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { PasswordService } from '../src/auth/password.service';
import { AppConfig } from '../src/config/app.config';
import { LoginAttemptService } from '../src/auth/login-attempt.service';
import { GLOBAL_PREFIX } from '../src/swagger';

/**
 * Himoyalangan test endpoint'lari: guard'larni haqiqiy HTTP orqali
 * tekshirish uchun. Ishlab chiqarish kodiga kirmaydi.
 */
@Controller('sinov-himoya')
class ProtectedController {
  @Get('har-kim')
  anyAuthenticated(): { ok: true } {
    return { ok: true };
  }

  @Get('faqat-admin')
  @Roles('ADMIN')
  adminOnly(): { ok: true } {
    return { ok: true };
  }

  @Get('faqat-haydovchi')
  @Roles('DRIVER')
  driverOnly(): { ok: true } {
    return { ok: true };
  }

  @Get('ombor-ruxsati')
  @Permissions('stock.adjust')
  stockAdjust(): { ok: true } {
    return { ok: true };
  }

  @Get('mavjud-emas-ruxsat')
  @Permissions('payments.manage', 'roles.manage')
  multiPermission(): { ok: true } {
    return { ok: true };
  }
}

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const ADMIN = { email: 'e2e-admin@barff.uz', password: 'E2E-Admin-Parol-2026' };
const DRIVER = { email: 'e2e-driver@barff.uz', password: 'E2E-Driver-Parol-2026' };
const INACTIVE = { email: 'e2e-inactive@barff.uz', password: 'E2E-Inactive-Parol-2026' };

async function createUser(
  email: string,
  password: string,
  roleCode: string,
  isActive = true,
): Promise<string> {
  const passwords = new PasswordService();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });

  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      fullName: `E2E ${roleCode}`,
      passwordHash: await passwords.hash(password),
      isActive,
      roles: { create: { roleId: role.id } },
    },
  });

  return user.id;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let adminId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [ProtectedController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    app.use(cookieParser());
    await app.init();

    adminId = await createUser(ADMIN.email, ADMIN.password, 'ADMIN');
    await createUser(DRIVER.email, DRIVER.password, 'DRIVER');
    await createUser(INACTIVE.email, INACTIVE.password, 'ADMIN', false);
  });

  /**
   * Har bir testdan oldin urinish hisoblagichlari tozalanadi.
   *
   * Testlar atayin ko'p marta noto'g'ri parol yuboradi va hammasi bitta
   * IP'dan keladi — tozalanmasa, keyingi testlar 401 o'rniga 403 (bloklangan)
   * olib, sababi tushunarsiz tarzda yiqilardi.
   */
  beforeEach(async () => {
    const attempts = app.get(LoginAttemptService);
    await attempts.resetIp('::ffff:127.0.0.1');
    await attempts.resetIp('::1');
    await attempts.resetIp('127.0.0.1');
    for (const creds of [ADMIN, DRIVER, INACTIVE]) {
      await attempts.reset(creds.email, '::ffff:127.0.0.1');
    }
    await attempts.reset('yoq@barff.uz', '::ffff:127.0.0.1');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ADMIN.email, DRIVER.email, INACTIVE.email] } },
    });
    await prisma.$disconnect();
    await app?.close();
  });

  const login = (creds: { email: string; password: string }) =>
    request(app.getHttpServer()).post(`${base}/auth/login`).send(creds);

  describe('POST /auth/login', () => {
    it("to'g'ri ma'lumot bilan token va foydalanuvchini qaytaradi", async () => {
      const res = await login(ADMIN).expect(200);

      expect(res.body.accessToken).toBeTypeOf('string');
      expect(res.body.refreshToken).toBeTypeOf('string');
      expect(res.body.user.email).toBe(ADMIN.email);
      expect(res.body.user.roles).toContain('ADMIN');
      expect(res.body.user.permissions).toContain('stock.adjust');
    });

    it('javobda parol hash yoki parol maydoni bolmaydi', async () => {
      const res = await login(ADMIN).expect(200);
      const body = JSON.stringify(res.body);

      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain(ADMIN.password);
    });

    it('HttpOnly cookie ornatadi', async () => {
      const res = await login(ADMIN).expect(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];

      const access = cookies.find((c) => c.startsWith('barff_access='));
      const refresh = cookies.find((c) => c.startsWith('barff_refresh='));

      expect(access).toContain('HttpOnly');
      expect(refresh).toContain('HttpOnly');
      // Refresh cookie faqat auth yo'llariga yuboriladi.
      expect(refresh).toContain('Path=/api/v1/auth');
    });

    it("noto'g'ri parolni 401 bilan rad etadi", async () => {
      const res = await login({ email: ADMIN.email, password: 'butunlay-boshqa' }).expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('mavjud bolmagan email uchun AYNAN SHU xabarni qaytaradi', async () => {
      const res = await login({ email: 'yoq@barff.uz', password: 'xohlagan' }).expect(401);

      // Xabar mavjud foydalanuvchinikidan farq qilmasligi kerak — aks holda
      // qaysi emaillar ro'yxatdan o'tgani aniqlanib qolardi.
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.message).toBe("Email yoki parol noto'g'ri");
    });

    it('faol bolmagan akkauntni 403 bilan rad etadi', async () => {
      const res = await login(INACTIVE).expect(403);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('GET /auth/me', () => {
    it('tokensiz 401 qaytaradi', async () => {
      const res = await request(app.getHttpServer()).get(`${base}/auth/me`).expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('Bearer token bilan ishlaydi', async () => {
      const { body } = await login(ADMIN).expect(200);

      const res = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(ADMIN.email);
    });

    it('cookie bilan ham ishlaydi', async () => {
      const loginRes = await login(ADMIN).expect(200);
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.email).toBe(ADMIN.email);
    });

    it('buzilgan tokenni rad etadi', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', 'Bearer buzilgan.token.qiymati')
        .expect(401);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('muddati tugagan tokenni rad etadi', async () => {
      // Muddati allaqachon o'tgan token: `expiresIn: -10` — 10 soniya oldin
      // tugagan. Shu tufayli testda soat kutib o'tirishga hojat yo'q.
      const expired = await app
        .get(JwtService)
        .signAsync(
          { sub: adminId, email: ADMIN.email, roles: ['ADMIN'] },
          { secret: app.get(AppConfig).jwt.accessSecret, expiresIn: -10 },
        );

      const res = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /auth/refresh — rotation', () => {
    it('yangi token juftligini beradi', async () => {
      const { body } = await login(ADMIN).expect(200);

      const res = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(200);

      expect(res.body.refreshToken).not.toBe(body.refreshToken);
      expect(res.body.user.email).toBe(ADMIN.email);
    });

    it('eski refresh token ikkinchi marta ishlamaydi', async () => {
      const { body } = await login(ADMIN).expect(200);

      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(401);

      expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('qayta ishlatish aniqlansa BUTUN sessiya bekor boladi', async () => {
      const { body } = await login(ADMIN).expect(200);

      // 1-almashtirish: yangi juftlik olinadi.
      const rotated = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(200);

      // Eski token qayta taqdim etiladi -> o'g'irlanish belgisi.
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(401);

      // Endi YANGI token ham ishlamasligi kerak.
      const res = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);

      expect(res.body.code).toBe('SESSION_REVOKED');
    });

    it('access tokenni refresh sifatida qabul qilmaydi', async () => {
      const { body } = await login(ADMIN).expect(200);

      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.accessToken })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('sessiyani bekor qiladi va cookielarni tozalaydi', async () => {
      const { body } = await login(ADMIN).expect(200);

      const res = await request(app.getHttpServer())
        .post(`${base}/auth/logout`)
        .send({ refreshToken: body.refreshToken })
        .expect(204);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('barff_access=;'))).toBe(true);

      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: body.refreshToken })
        .expect(401);
    });

    it('yaroqsiz token bilan ham 204 qaytaradi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/auth/logout`)
        .send({ refreshToken: 'yaroqsiz' })
        .expect(204);
    });
  });

  describe('RBAC', () => {
    const authed = async (creds: { email: string; password: string }) => {
      const { body } = await login(creds).expect(200);
      return `Bearer ${body.accessToken}`;
    };

    it('istalgan autentifikatsiyalangan foydalanuvchini otkazadi', async () => {
      await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/har-kim`)
        .set('Authorization', await authed(DRIVER))
        .expect(200);
    });

    it('ADMIN rolini talab qiladigan yolga adminni otkazadi', async () => {
      await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/faqat-admin`)
        .set('Authorization', await authed(ADMIN))
        .expect(200);
    });

    it('notogri rol 403 oladi', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/faqat-admin`)
        .set('Authorization', await authed(DRIVER))
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('ruxsat boyicha cheklash ishlaydi', async () => {
      await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/ombor-ruxsati`)
        .set('Authorization', await authed(ADMIN))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/ombor-ruxsati`)
        .set('Authorization', await authed(DRIVER))
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN_PERMISSION');
    });

    it('403 javobi qaysi ruxsat yetishmaganini OSHKOR QILMAYDI', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/sinov-himoya/mavjud-emas-ruxsat`)
        .set('Authorization', await authed(DRIVER))
        .expect(403);

      expect(res.body.message).not.toContain('payments.manage');
      expect(res.body.message).not.toContain('roles.manage');
    });

    it('himoyalangan yol tokensiz 401 beradi', async () => {
      await request(app.getHttpServer()).get(`${base}/sinov-himoya/har-kim`).expect(401);
    });
  });
});
