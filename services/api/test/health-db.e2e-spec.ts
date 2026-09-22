import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { GLOBAL_PREFIX } from '../src/swagger';

/**
 * Readiness endpoint'i S03 dan keyin IKKI tekshiruvni qaytarishi kerak.
 *
 * Bu yerda ham "yashil" bo'lishi emas, SHAKLI tekshiriladi: CI'da baza va
 * Redis ko'tarilmagan bo'lishi mumkin, lekin indikatorlar ro'yxati baribir
 * to'liq bo'lishi shart — aks holda bog'liqlik jimgina tushib qolgani
 * sezilmay qoladi.
 */
describe('Health readiness (e2e)', () => {
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

  it('database va redis tekshiruvlarini qaytaradi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health/ready`);

    const names = res.body.checks.map((c: { name: string }) => c.name);
    expect(names).toContain('database');
    expect(names).toContain('redis');
  });

  it('bogliqlik tushsa status degraded va kod 503 boladi', async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health/ready`);
    const allUp = res.body.checks.every((c: { state: string }) => c.state === 'up');

    expect(res.body.status).toBe(allUp ? 'ok' : 'degraded');
    expect(res.status).toBe(allUp ? 200 : 503);
  });
});
