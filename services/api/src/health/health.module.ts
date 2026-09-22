import { Module } from '@nestjs/common';
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
        prisma: PrismaHealthIndicator,
        redis: RedisHealthIndicator,
      ): HealthIndicator[] => [prisma, redis],
      inject: [PrismaHealthIndicator, RedisHealthIndicator],
    },
  ],
})
export class HealthModule {}
