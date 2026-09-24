import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

/**
 * Diler arizasidagi tezlik chegarasi.
 *
 * ALOHIDA fayl: asosiy to'plamda (`dealers.e2e-spec.ts`) chegara
 * o'chirib qo'yilgan, chunki u yerda o'ndan ortiq ariza bor. Bu yerda
 * esa AYNAN chegaraning o'zi tekshiriladi — aks holda himoya "bor"
 * deb hisoblanib, amalda ishlamay qolishi mumkin edi.
 *
 * Bu endpoint uchun chegara lead formasidagidan MUHIMROQ: u AKKAUNT
 * yaratadi, ya'ni cheklovsiz bazani soxta foydalanuvchilar bilan
 * to'ldirish vositasiga aylanardi.
 */
const LIMIT = 5;

describe('Dealers throttle (e2e)', () => {
  let app: INestApplication;
  const prefix = `e2e-throttle-dealer-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    const dealers = await prisma.dealer.findMany({
      where: { companyName: { startsWith: prefix } },
      select: { id: true, userId: true },
    });
    const ids = dealers.map((d) => d.id);
    const userIds = dealers.map((d) => d.userId);

    await prisma.dealerEvent.deleteMany({ where: { dealerId: { in: ids } } });
    await prisma.dealer.deleteMany({ where: { id: { in: ids } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
    await app?.close();
  });

  it(`soatiga ${LIMIT} tadan ortiq ariza qabul qilinmaydi`, async () => {
    const send = (n: number) =>
      request(app.getHttpServer())
        .post(`${base}/dealers/register`)
        .send({
          // Har bir so'rov BOSHQA kompaniya va BOSHQA email: 429
          // takrordan emas, aynan chegaradan kelishi kerak.
          companyName: `${prefix} ${n}`,
          region: 'Toshkent',
          businessType: 'RETAIL',
          contactName: 'Sinov',
          phone: `+99893${String(3_000_000 + n).slice(0, 7)}`,
          email: `${prefix}-${n}@barff.uz`,
          password: 'Diler-Throttle-Parol-2026',
        });

    for (let n = 0; n < LIMIT; n += 1) {
      await send(n).expect(202);
    }

    await send(LIMIT).expect(429);
  });
});
