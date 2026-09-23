import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const ADMIN = { email: 'e2e-leads@barff.uz', password: 'E2E-Leads-Parol-2026' };

async function makeAdmin(): Promise<void> {
  const passwords = new PasswordService();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  await prisma.user.deleteMany({ where: { email: ADMIN.email } });
  await prisma.user.create({
    data: {
      email: ADMIN.email,
      fullName: 'E2E Leads Admin',
      passwordHash: await passwords.hash(ADMIN.password),
      roles: { create: { roleId: role.id } },
    },
  });
}

describe('Leads (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  const prefix = `e2e-lead-${Date.now()}`;
  /** Har bir test o'z telefon raqamini oladi — takror tekshiruvi aralashmasin. */
  let phoneCounter = 0;
  const nextPhone = () => `+99890${String(1_000_000 + (phoneCounter += 1)).slice(0, 7)}`;
  /** Server telefonni normallashtirib saqlaydi: `+998 90 ...` -> `99890...`. */
  const stored = (phone: string) => phone.replace(/\D/g, '');

  const payload = (overrides: Record<string, unknown> = {}) => ({
    companyName: `${prefix} MChJ`,
    contactName: 'Sinov Kontakt',
    phone: nextPhone(),
    region: 'Toshkent',
    businessType: 'DISTRIBUTOR',
    ...overrides,
  });

  beforeAll(async () => {
    /*
      Tezlik chegarasi bu yerda O'CHIRILADI: endpoint soatiga 5 ta
      arizaga ruxsat beradi va bu to'plamda undan ko'p so'rov bor.
      Chegaraning O'ZI alohida faylda (`leads-throttle.e2e-spec.ts`)
      tekshiriladi — ya'ni himoya sinovdan chetda qolmaydi.
    */
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // Hisoblagich hech qachon oshmaydi — ya'ni chegara bu to'plamda
      // ishlamaydi. `ThrottlerGuard` ning o'zi o'rnida qoladi.
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: () =>
          Promise.resolve({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: false,
            timeToBlockExpire: 0,
          }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    await makeAdmin();

    const login = await request(app.getHttpServer()).post(`${base}/auth/login`).send(ADMIN);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    const leads = await prisma.lead.findMany({
      where: { companyName: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = leads.map((lead) => lead.id);

    await prisma.leadEvent.deleteMany({ where: { leadId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { event: 'lead.created' } });
    await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });
    await prisma.$disconnect();
    await app?.close();
  });

  const admin = (method: 'get' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${base}/admin/leads${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

  it('ariza saqlanadi va tarix yozuvi yaratiladi', async () => {
    const body = payload();
    await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);

    const lead = await prisma.lead.findFirst({
      where: { phone: stored(body.phone) },
      include: { events: true },
    });

    expect(lead).not.toBeNull();
    expect(lead?.status).toBe('NEW');
    // Birinchi hodisa boshlang'ich holatni yozib qo'yadi.
    expect(lead?.events).toHaveLength(1);
    expect(lead?.events[0]?.toStatus).toBe('NEW');
  });

  /**
   * Bildirishnoma ASOSIY amal bilan birga ishlashi kerak.
   *
   * Provayder mock (`LogProvider`), shuning uchun tashqi tarmoqqa
   * chiqilmaydi — lekin yo'lning O'ZI to'liq bosib o'tiladi.
   */
  it('ariza kelganda bildirishnoma yoziladi', async () => {
    await prisma.systemSetting.upsert({
      where: { key: 'notifications.lead' },
      update: { value: { email: `${prefix}@barff.uz` } },
      create: { key: 'notifications.lead', value: { email: `${prefix}@barff.uz` } },
    });

    const body = payload();
    await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);

    const notification = await prisma.notification.findFirst({
      where: { event: 'lead.created', recipientAddress: `${prefix}@barff.uz` },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).not.toBeNull();
    expect(notification?.status).toBe('SENT');
    // Xabar tanasida parol/token bo'lmasligi shart.
    expect(notification?.body).toContain(prefix);
  });

  it('sozlanmagan manzilga (`REPLACE_...`) xabar yuborilmaydi', async () => {
    await prisma.systemSetting.upsert({
      where: { key: 'notifications.lead' },
      update: { value: { email: 'REPLACE_WITH_REAL_DATA' } },
      create: { key: 'notifications.lead', value: { email: 'REPLACE_WITH_REAL_DATA' } },
    });

    await request(app.getHttpServer()).post(`${base}/leads`).send(payload()).expect(202);

    const notification = await prisma.notification.findFirst({
      where: { recipientAddress: 'REPLACE_WITH_REAL_DATA' },
    });

    expect(notification).toBeNull();
  });

  it('honeypot toldirilgan sorov rad etiladi', async () => {
    const body = payload({ honeypot: 'bot yozdi' });
    await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(400);

    const lead = await prisma.lead.findFirst({ where: { phone: stored(body.phone) } });
    expect(lead).toBeNull();
  });

  it('takroriy ariza YANGI yozuv yaratmaydi', async () => {
    const body = payload();

    await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);
    // Formani ikki marta bosish — xato EMAS, lekin ikkinchi yozuv ham yo'q.
    await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);

    const count = await prisma.lead.count({ where: { phone: stored(body.phone) } });
    expect(count).toBe(1);
  });

  it('telefon boshqacha yozilsa ham takror deb taniladi', async () => {
    const digits = nextPhone().replace(/\D/g, '');

    await request(app.getHttpServer())
      .post(`${base}/leads`)
      .send(payload({ phone: `+${digits}` }))
      .expect(202);
    await request(app.getHttpServer())
      .post(`${base}/leads`)
      .send(payload({ phone: digits }))
      .expect(202);

    const count = await prisma.lead.count({
      where: { dedupeKey: { endsWith: `|${digits}` } },
    });
    expect(count).toBe(1);
  });

  it('majburiy maydonsiz sorov 400 beradi', async () => {
    await request(app.getHttpServer()).post(`${base}/leads`).send({ companyName: 'X' }).expect(400);
  });

  it('javobda ichki identifikator YOQ', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/leads`)
      .send(payload())
      .expect(202);

    expect(res.body).toEqual({ accepted: true });
    expect(JSON.stringify(res.body)).not.toContain('id');
  });

  describe('admin', () => {
    it('royxat va holat almashtirish ishlaydi', async () => {
      const body = payload();
      await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);

      const lead = await prisma.lead.findFirstOrThrow({ where: { phone: stored(body.phone) } });

      const list = await admin('get', '?limit=100').expect(200);
      expect((list.body.items as { id: string }[]).map((item) => item.id)).toContain(lead.id);

      await admin('patch', `/${lead.id}/status`)
        .send({ status: 'CONTACTED', note: "Qo'ng'iroq qilindi" })
        .expect(200);

      const after = await prisma.lead.findUniqueOrThrow({
        where: { id: lead.id },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });

      expect(after.status).toBe('CONTACTED');
      expect(after.events).toHaveLength(2);
      expect(after.events[1]?.fromStatus).toBe('NEW');
    });

    it("notogri o'tish rad etiladi", async () => {
      const body = payload();
      await request(app.getHttpServer()).post(`${base}/leads`).send(body).expect(202);

      const lead = await prisma.lead.findFirstOrThrow({ where: { phone: stored(body.phone) } });

      // `NEW` dan to'g'ridan-to'g'ri `CONVERTED` ga sakrab bo'lmaydi.
      await admin('patch', `/${lead.id}/status`).send({ status: 'CONVERTED' }).expect(400);
    });

    it('autentifikatsiyasiz royxat KORINMAYDI', async () => {
      await request(app.getHttpServer()).get(`${base}/admin/leads`).expect(401);
    });
  });
});
