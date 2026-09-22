import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { type HealthIndicator } from '../health.types';

@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  readonly name = 'redis';

  constructor(private readonly redis: RedisService) {}

  check(): Promise<boolean> {
    return this.redis.ping();
  }
}
