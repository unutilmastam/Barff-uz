import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HEALTH_INDICATORS, type HealthIndicator } from './health.types';
import { RedisHealthIndicator } from './indicators/redis.indicator';

/**
 * Tekshiruvlar ro'yxati shu yerda yig'iladi.
 * S03 da `PrismaHealthIndicator` shu ro'yxatga qo'shiladi.
 */
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    RedisHealthIndicator,
    {
      provide: HEALTH_INDICATORS,
      useFactory: (redis: RedisHealthIndicator): HealthIndicator[] => [redis],
      inject: [RedisHealthIndicator],
    },
  ],
})
export class HealthModule {}
