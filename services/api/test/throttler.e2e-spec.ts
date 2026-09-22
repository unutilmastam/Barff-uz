import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * Rate limiter'ni ALOHIDA tekshiramiz.
 *
 * `AppModule` dagi yagona controller — health, u esa qasddan `@SkipThrottle()`
 * bilan belgilangan (probe'lar bloklanmasligi kerak). Mavjud bo'lmagan yo'llar
 * esa controller'ga umuman yetib bormaydi, ya'ni guard ishlamaydi. Shuning
 * uchun bu yerda haqiqiy guard bilan vaqtinchalik controller ko'tariladi.
 */
@Controller('sinov')
class ProbeController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

const LIMIT = 5;

describe('ThrottlerGuard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: LIMIT }])],
      controllers: [ProbeController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('limitgacha sorovlarni otkazadi, keyin 429 qaytaradi', async () => {
    const server = app.getHttpServer();

    for (let i = 0; i < LIMIT; i += 1) {
      await request(server).get('/sinov').expect(200);
    }

    const blocked = await request(server).get('/sinov').expect(429);
    expect(blocked.body).toMatchObject({ statusCode: 429 });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('429 javobi ham yagona xato shaklida keladi', async () => {
    const res = await request(app.getHttpServer()).get('/sinov').expect(429);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('requestId');
  });
});
