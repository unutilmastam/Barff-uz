import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { ProductsService } from '../src/products/products.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;
const STAMP = Date.now();
const PATH = `/products?search=e2e-${STAMP}`;

/**
 * TEST HODISASI (S41 DoD: "ogohlantirish test hodisasida ishlaydi").
 *
 * Haqiqiy zanjir: so'rov -> servis 500 beradi -> global filtr ->
 * `SystemAlertService` -> `NotificationsService` -> bazadagi yozuv.
 * Hech narsa soxtalashtirilmagan, faqat xatoning o'zi sun'iy.
 */
describe('Tizim xatosi ogohlantirishi (e2e)', () => {
  let app: INestApplication;
  let adminId = '';

  beforeAll(async () => {
    // Qabul qiluvchi — shu testning O'Z admini: bazada boshqa admin bor-yo'qligiga
    // (yoki parallel test uni o'chirib yuborganiga) bog'liq bo'lmasin.
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    adminId = (
      await prisma.user.create({
        data: {
          email: `e2e-alert-${STAMP}@barff.uz`,
          fullName: 'E2E Alert Admin',
          passwordHash: await new PasswordService().hash('E2E-Alert-Parol-2026'),
          roles: { create: { roleId: role.id } },
        },
      })
    ).id;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ProductsService)
      .useValue({
        listPublic: () => Promise.reject(new TypeError(`baza-ichki-sir-${STAMP}`)),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { event: 'system.error', body: { contains: `e2e-${STAMP}` } },
    });
    await prisma.$disconnect();
    await app?.close();
  });

  it('500 bo‘lganda bildirishnoma BAZAGA yoziladi; mijoz ichki tafsilotni KO‘RMAYDI', async () => {
    const res = await request(app.getHttpServer()).get(`${base}${PATH}`).expect(500);

    expect(res.body.requestId).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('baza-ichki-sir');

    // Ogohlantirish javobni kutdirmaydi (fire-and-forget) — qisqa kutamiz.
    let rows: { body: string; recipientId: string | null }[] = [];
    for (let i = 0; i < 40 && rows.length === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      rows = await prisma.notification.findMany({
        where: {
          event: 'system.error',
          recipientId: adminId,
          body: { contains: res.body.requestId },
        },
        select: { body: true, recipientId: true },
      });
    }

    expect(rows.length).toBeGreaterThan(0);

    const text = rows.map((row) => row.body).join('\n');
    expect(text).toContain('TypeError');
    expect(text).toContain(res.body.requestId);
    // Xato XABARI va so'rov satri (`search=...`) bildirishnomaga TUSHMAYDI.
    expect(text).not.toContain('baza-ichki-sir');
    expect(text).not.toContain(`e2e-${STAMP}`);
  });
});
