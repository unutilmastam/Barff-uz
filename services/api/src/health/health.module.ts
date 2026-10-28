import { Module } from '@nestjs/common';
import { AppConfig } from '../config/app.config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HEALTH_INDICATORS, type HealthIndicator } from './health.types';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';

/**
 * Tekshiruvlar ro'yxati shu yerda yig'iladi.
 * S08 da S3 uchun indikator shu ro'yxatga qo'shiladi.
 */
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    RedisHealthIndicator,
    PrismaHealthIndicator,
    {
      provide: HEALTH_INDICATORS,
      useFactory: (
        config: AppConfig,
        prisma: PrismaHealthIndicator,
        redis: RedisHealthIndicator,
      ): HealthIndicator[] => buildIndicators(config.redisUrl !== undefined, prisma, redis),
      inject: [AppConfig, PrismaHealthIndicator, RedisHealthIndicator],
    },
  ],
})
export class HealthModule {}

/**
 * Redis FAQAT sozlangan bo'lsa tekshiriladi.
 *
 * cPanel'da Redis yo'q va u KERAK EMAS (`docs/OPEN-QUESTIONS.md` Q18;
 * `REDIS_URL` kiritilmaydi). Avval indikator har doim ro'yxatda edi va
 * shu sababli `/health/ready` u yerda DOIM `503` qaytarardi — tashqi
 * monitor (`docs/RUNBOOK.md`) har daqiqada yolg'on signal berardi
 * (F01 da paketni production rejimida ishga tushirib topildi).
 *
 * Sozlangan, lekin javob bermayotgan Redis esa baribir `degraded` beradi.
 */
export function buildIndicators(
  redisConfigured: boolean,
  prisma: HealthIndicator,
  redis: HealthIndicator,
): HealthIndicator[] {
  return redisConfigured ? [prisma, redis] : [prisma];
}
