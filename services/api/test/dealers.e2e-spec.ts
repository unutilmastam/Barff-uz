import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const STAMP = Date.now();
const ADMIN = { email: `e2e-dealers-admin-${STAMP}@barff.uz`, password: 'E2E-Dealers-Parol-2026' };
const PREFIX = `e2e-dealer-${STAMP}`;

/**
 * Diler oqimi (S22).
 *
 * ASOSIY DA'VO: TASDIQLANMAGAN diler diler endpoint'lariga kira
 * OLMAYDI. Buni panelda tugma yashirish bilan emas, SERVER javobi
 * bilan tekshiramiz — `CLAUDE.md` §3: "Never rely only on hiding
 * frontend buttons."
 */
describe('Dealers (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';

  const emailFor = (suffix: string) => `${PREFIX}-${suffix}@barff.uz`;

  let phoneCounter = 0;
  const nextPhone = () => `+99891${String(2_000_000 + (phoneCounter += 1)).slice(0, 7)}`;

  const registration = (suffix: string, overrides: Record<string, unknown> = {}) => ({
    companyName: `${PREFIX}-${suffix} MChJ`,
    region: 'Toshkent',
    businessType: 'DISTRIBUTOR',
    contactName: 'Sinov Diler',
    phone: nextPhone(),
    email: emailFor(suffix),
    password: 'Diler-Sinov-Parol-2026',
    ...overrides,
  });

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password });

    return { status: response.status, token: response.body.accessToken as string | undefined };
  };

  beforeAll(async () => {
    /*
      Tezlik chegarasi o'chiriladi: ro'yxatdan o'tish soatiga 5 ta va
      bu to'plamda undan ko'p ariza bor. Chegaraning O'ZI alohida
      faylda tekshiriladi (`dealers-throttle.e2e-spec.ts`), ya'ni
      himoya sinovdan chetda qolmaydi.
    */
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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

    const passwords = new PasswordService();
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        fullName: 'E2E Dealers Admin',
        passwordHash: await passwords.hash(ADMIN.password),
        roles: { create: { roleId: role.id } },
      },
    });

    adminToken = (await login(ADMIN.email, ADMIN.password)).token ?? '';
    expect(adminToken).not.toBe('');
  });

  afterAll(async () => {
    const dealers = await prisma.dealer.findMany({
      where: { companyName: { startsWith: PREFIX } },
      select: { id: true, userId: true },
    });
    const ids = dealers.map((d) => d.id);
    const userIds = dealers.map((d) => d.userId);

    await prisma.dealerEvent.deleteMany({ where: { dealerId: { in: ids } } });
    await prisma.dealerAddress.deleteMany({ where: { dealerId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { entity: 'dealer', entityId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { entity: 'dealer_address' } });
    await prisma.notification.deleteMany({
      where: { event: { in: ['dealer.registered', 'dealer.status.changed'] } },
    });
    await prisma.dealer.deleteMany({ where: { id: { in: ids } } });
    await prisma.dealerTier.deleteMany({ where: { code: { startsWith: 'E2E' } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshTokenFamily.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });

    await prisma.$disconnect();
    await app?.close();
  });

  const asAdmin = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${base}${path}`)
      .set('Authorization', `Bearer ${adminToken}`);

  // ===========================================================================
  // RO'YXATDAN O'TISH
  // ===========================================================================

  it('ariza akkaunt va diler yozuvini BIRGA yaratadi', async () => {
    const body = registration('create');

    await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

    const dealer = await prisma.dealer.findFirst({
      where: { companyName: body.companyName },
      include: { user: { include: { roles: { include: { role: true } } } }, events: true },
    });

    expect(dealer).not.toBeNull();
    expect(dealer?.status).toBe('PENDING');
    expect(dealer?.user.email).toBe(body.email);
    expect(dealer?.user.roles.map((r) => r.role.code)).toContain('DEALER');
    // Tarix birinchi kundan boshlanadi.
    expect(dealer?.events).toHaveLength(1);
    expect(dealer?.events[0]?.toStatus).toBe('PENDING');
  });

  it("band email uchun javob BIR XIL — akkaunt borligi oshkor bo'lmaydi", async () => {
    const body = registration('dup');

    await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

    // Aynan shu email bilan ikkinchi ariza, boshqa kompaniya nomi bilan.
    const second = { ...body, companyName: `${PREFIX}-dup-2 MChJ`, phone: nextPhone() };
    const response = await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send(second)
      .expect(202);

    expect(response.body).toEqual({ accepted: true });

    // Lekin YANGI yozuv yaratilmagan.
    const created = await prisma.dealer.findFirst({
      where: { companyName: second.companyName },
    });
    expect(created).toBeNull();
  });

  it("takroriy STIR ochiq xato beradi — u ommaviy ma'lumot", async () => {
    const taxId = String(100_000_000 + (STAMP % 800_000_000)).slice(0, 9);

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send(registration('tax-1', { taxId }))
      .expect(202);

    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send(registration('tax-2', { taxId }))
      .expect(409);
  });

  it('bot tuzogi to‘ldirilsa ariza rad etiladi', async () => {
    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send(registration('bot', { honeypot: 'men botman' }))
      .expect(400);
  });

  it('zaif parol qabul qilinmaydi', async () => {
    await request(app.getHttpServer())
      .post(`${base}/dealers/register`)
      .send(registration('weak', { password: '12345' }))
      .expect(400);
  });

  // ===========================================================================
  // ASOSIY DA'VO: TASDIQLANMAGAN DILER KIRA OLMAYDI
  // ===========================================================================

  describe('tasdiqlanmagan diler', () => {
    let token = '';
    let dealerId = '';

    beforeAll(async () => {
      const body = registration('pending');
      await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

      token = (await login(body.email, body.password)).token ?? '';
      expect(token).not.toBe('');

      const dealer = await prisma.dealer.findFirstOrThrow({
        where: { companyName: body.companyName },
        select: { id: true },
      });
      dealerId = dealer.id;
    });

    it('TIZIMGA KIRA OLADI — arizasini kuzatishi kerak', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/dealer/profile`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('PENDING');
    });

    it('lekin manzillarga KIRA OLMAYDI (403)', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.code).toBe('DEALER_NOT_ACTIVE');
    });

    it('manzil QO‘SHA ham olmaydi (403)', async () => {
      await request(app.getHttpServer())
        .post(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Ombor',
          region: 'Toshkent',
          street: 'Sinov 1',
          contactName: 'Sinov',
          contactPhone: nextPhone(),
        })
        .expect(403);
    });

    it('admin endpoint‘lariga umuman kira olmaydi (403)', async () => {
      await request(app.getHttpServer())
        .get(`${base}/admin/dealers`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('tasdiqlangach O‘SHA token bilan manzillar OCHILADI', async () => {
      await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);

      /*
        DIQQAT: bu yerda QAYTA KIRILMAYDI — ataylab.

        Tasdiqlash JORIY sessiyaga darhol ta'sir qilishi kerak: diler
        qayta kirishga majbur bo'lmasligi lozim. Holat token ichida
        saqlansa, u eski qiymat bilan qolardi va tasdiqlangan diler
        token muddati tugaguncha 403 olaverardi. Shu test aynan
        o'shani ushlaydi: eski token, yangi huquq.
      */
      await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it("to'xtatilgach O'SHA token bilan yana YOPILADI", async () => {
      await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
        .send({ status: 'SUSPENDED', reason: 'Sinov uchun' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ===========================================================================
  // TASDIQLASH VA AUDIT
  // ===========================================================================

  describe('tasdiqlash', () => {
    let dealerId = '';

    beforeAll(async () => {
      const body = registration('approve');
      await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

      dealerId = (
        await prisma.dealer.findFirstOrThrow({
          where: { companyName: body.companyName },
          select: { id: true },
        })
      ).id;
    });

    it("RUXSAT ETILMAGAN o'tish rad etiladi", async () => {
      // PENDING -> SUSPENDED jadvalda yo'q.
      const response = await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
        .send({ status: 'SUSPENDED', reason: 'Sinov' })
        .expect(400);

      expect(response.body.code).toBe('DEALER_STATUS_INVALID_TRANSITION');
    });

    it('RAD ETISH uchun sabab MAJBURIY', async () => {
      await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
        .send({ status: 'REJECTED' })
        .expect(400);
    });

    it('tasdiqlash AUDIT jurnaliga oldingi va yangi holat bilan yoziladi', async () => {
      await asAdmin('patch', `/admin/dealers/${dealerId}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);

      const entry = await prisma.auditLog.findFirst({
        where: { entity: 'dealer', entityId: dealerId, action: 'dealer.status.changed' },
        orderBy: { createdAt: 'desc' },
      });

      expect(entry).not.toBeNull();
      expect(entry?.actorEmail).toBe(ADMIN.email);
      expect(entry?.before).toMatchObject({ status: 'PENDING' });
      expect(entry?.after).toMatchObject({ status: 'APPROVED' });

      // Diler tarixida ham ko'rinadi — bu dilerning O'ZIGA ko'rsatiladi.
      const events = await prisma.dealerEvent.findMany({
        where: { dealerId },
        orderBy: { createdAt: 'asc' },
      });
      expect(events.map((e) => e.toStatus)).toEqual(['PENDING', 'APPROVED']);
    });

    it("ichki izoh DILERGA ko'rsatilmaydi", async () => {
      await asAdmin('patch', `/admin/dealers/${dealerId}/terms`)
        .send({ internalNote: 'Ichki: to‘lov tarixi zaif' })
        .expect(200);

      const dealer = await prisma.dealer.findFirstOrThrow({
        where: { id: dealerId },
        select: { userId: true },
      });
      const user = await prisma.user.findFirstOrThrow({
        where: { id: dealer.userId },
        select: { email: true },
      });

      const token = (await login(user.email, 'Diler-Sinov-Parol-2026')).token ?? '';
      const response = await request(app.getHttpServer())
        .get(`${base}/dealer/profile`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.internalNote).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('to‘lov tarixi zaif');
    });
  });

  // ===========================================================================
  // MANZILLAR
  // ===========================================================================

  describe('manzillar', () => {
    let token = '';
    let otherToken = '';
    let otherAddressId = '';

    const address = (label: string) => ({
      label,
      region: 'Toshkent',
      street: `${label} ko'chasi 1`,
      contactName: 'Sinov Kontakt',
      contactPhone: nextPhone(),
    });

    const approve = async (suffix: string) => {
      const body = registration(suffix);
      await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

      const dealer = await prisma.dealer.findFirstOrThrow({
        where: { companyName: body.companyName },
        select: { id: true },
      });

      await asAdmin('patch', `/admin/dealers/${dealer.id}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);

      return (await login(body.email, body.password)).token ?? '';
    };

    beforeAll(async () => {
      token = await approve('addr');
      otherToken = await approve('addr-other');

      const created = await request(app.getHttpServer())
        .post(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(address('Begona'))
        .expect(201);

      otherAddressId = created.body.id as string;
    });

    it('BIRINCHI manzil avtomatik STANDART bo‘ladi', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .send(address('Asosiy'))
        .expect(201);

      expect(response.body.isDefault).toBe(true);
    });

    it('yangi standart eskisini ALMASHTIRADI — ikkitasi bo‘lmaydi', async () => {
      await request(app.getHttpServer())
        .post(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...address('Ikkinchi'), isDefault: true })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const defaults = (response.body as { isDefault: boolean }[]).filter((a) => a.isDefault);
      expect(defaults).toHaveLength(1);
    });

    it("BOSHQA dilerning manzili KO'RINMAYDI", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const labels = (response.body as { label: string }[]).map((a) => a.label);
      expect(labels).not.toContain('Begona');
    });

    it("BOSHQA dilerning manzilini tahrirlab bo'lmaydi (404)", async () => {
      await request(app.getHttpServer())
        .patch(`${base}/dealer/addresses/${otherAddressId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ label: 'O‘g‘irlangan' })
        .expect(404);

      // Va yozuv O'ZGARMAGAN.
      const row = await prisma.dealerAddress.findFirstOrThrow({ where: { id: otherAddressId } });
      expect(row.label).toBe('Begona');
    });

    it("BOSHQA dilerning manzilini o'chirib bo'lmaydi (404)", async () => {
      await request(app.getHttpServer())
        .delete(`${base}/dealer/addresses/${otherAddressId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      const row = await prisma.dealerAddress.findFirstOrThrow({ where: { id: otherAddressId } });
      expect(row.deletedAt).toBeNull();
    });

    it("standart manzil o'chirilsa, standart BOSHQASIGA o'tadi", async () => {
      const list = await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const current = (list.body as { id: string; isDefault: boolean }[]).find((a) => a.isDefault);
      expect(current).toBeDefined();

      await request(app.getHttpServer())
        .delete(`${base}/dealer/addresses/${current?.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const after = await request(app.getHttpServer())
        .get(`${base}/dealer/addresses`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const defaults = (after.body as { isDefault: boolean }[]).filter((a) => a.isDefault);
      expect(defaults).toHaveLength(1);
    });
  });

  // ===========================================================================
  // DILER O'ZIGA CHEGIRMA BERA OLMAYDI
  // ===========================================================================

  it("diler o'z profili orqali DARAJA va LIMITni o'zgartira olmaydi", async () => {
    const body = registration('terms');
    await request(app.getHttpServer()).post(`${base}/dealers/register`).send(body).expect(202);

    const dealer = await prisma.dealer.findFirstOrThrow({
      where: { companyName: body.companyName },
      select: { id: true },
    });

    await asAdmin('patch', `/admin/dealers/${dealer.id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const tier = await asAdmin('post', '/admin/dealer-tiers')
      .send({ code: `E2E${STAMP % 100000}`, name: 'Sinov daraja', discountBasisPoints: 500 })
      .expect(201);

    const token = (await login(body.email, body.password)).token ?? '';

    // Diler daraja va limitni O'ZI yozmoqchi.
    await request(app.getHttpServer())
      .patch(`${base}/dealer/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tierId: tier.body.id, creditLimit: 999_999_00, status: 'APPROVED' })
      .expect(200);

    const after = await prisma.dealer.findFirstOrThrow({ where: { id: dealer.id } });

    // Hech biri o'tmagan.
    expect(after.tierId).toBeNull();
    expect(after.creditLimit).toBeNull();
  });
});
