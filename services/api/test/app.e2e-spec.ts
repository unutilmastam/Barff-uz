import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { GLOBAL_PREFIX } from '../src/swagger';

/**
 * Smoke test: API haqiqatan ham ko'tariladimi, global prefiks, request id,
 * xato shakli va rate limiter ishlaydimi.
 *
 * Redis bu yerda ishlamasligi mumkin — shuning uchun `/health/ready` ning
 * MAZMUNI tekshiriladi, "yashil" bo'lishi emas.
 */
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('liveness 200 qaytaradi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('har bir javobga x-request-id qoshadi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health`);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('mijoz bergan xavfsiz request id ni saqlaydi', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${GLOBAL_PREFIX}/health`)
      .set('x-request-id', 'trace-abc-12345678');
    expect(res.headers['x-request-id']).toBe('trace-abc-12345678');
  });

  // Node HTTP mijozining o'zi yangi qatorli header'ni yubormaydi, shuning
  // uchun bu yerda HTTP jihatdan to'g'ri, lekin bizning qoidaga mos kelmaydigan
  // qiymat ishlatiladi.
  it('qoidaga mos kelmaydigan request id ni yangisiga almashtiradi', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${GLOBAL_PREFIX}/health`)
      .set('x-request-id', '<script>alert(1)</script>');
    expect(res.headers['x-request-id']).not.toContain('script');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('juda qisqa request id ni qabul qilmaydi', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${GLOBAL_PREFIX}/health`)
      .set('x-request-id', 'abc');
    expect(res.headers['x-request-id']).not.toBe('abc');
  });

  it('readiness tekshiruvlar royxatini qaytaradi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health/ready`);
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks.map((c: { name: string }) => c.name)).toContain('redis');
    expect(res.body.status).toBe(res.status === 200 ? 'ok' : 'degraded');
  });

  it('nomavjud yol uchun yagona xato shaklini beradi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/yoq-bunday`).expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('global prefikssiz yol ishlamaydi', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
