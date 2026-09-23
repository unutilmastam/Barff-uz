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
 * Ariza endpoint'idagi tezlik chegarasi.
 *
 * ALOHIDA fayl: asosiy to'plamda chegara o'chirib qo'yilgan (u yerda
 * o'ndan ortiq so'rov bor). Bu yerda esa AYNAN chegaraning o'zi
 * tekshiriladi — aks holda himoya "bor" deb hisoblanib, amalda
 * ishlamay qolishi mumkin edi.
 *
 * Chegara: soatiga 5 ta (`@Throttle` dekoratori).
 */
const LIMIT = 5;

describe('Leads throttle (e2e)', () => {
  let app: INestApplication;
  const prefix = `e2e-throttle-lead-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    const leads = await prisma.lead.findMany({
      where: { companyName: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = leads.map((lead) => lead.id);

    await prisma.leadEvent.deleteMany({ where: { leadId: { in: ids } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    await app?.close();
  });

  it(`soatiga ${LIMIT} tadan ortiq ariza qabul qilinmaydi`, async () => {
    const send = (n: number) =>
      request(app.getHttpServer())
        .post(`${base}/leads`)
        .send({
          // Har bir so'rov BOSHQA kompaniya: 429 takror tekshiruvidan
          // emas, aynan chegaradan kelishi kerak.
          companyName: `${prefix} ${n}`,
          contactName: 'Sinov',
          phone: `+99891${String(2_000_000 + n).slice(0, 7)}`,
          region: 'Toshkent',
          businessType: 'RETAIL',
        });

    for (let n = 0; n < LIMIT; n += 1) {
      await send(n).expect(202);
    }

    await send(LIMIT).expect(429);
  });
});
