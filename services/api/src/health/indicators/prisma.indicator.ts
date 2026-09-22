import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { type HealthIndicator } from '../health.types';

@Injectable()
export class PrismaHealthIndicator implements HealthIndicator {
  readonly name = 'database';

  constructor(private readonly prisma: PrismaService) {}

  check(): Promise<boolean> {
    return this.prisma.isReachable();
  }
}
