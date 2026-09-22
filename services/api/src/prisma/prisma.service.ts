import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@barff/db';

/**
 * Prisma klientining yagona nusxasi.
 *
 * Nest hayot sikliga ulanadi: modul ko'tarilganda ulanadi, to'xtaganda
 * ulanishni yopadi. Ulanishlar yopilmasa, ECS deploy paytida eski task
 * PostgreSQL'da osilgan sessiyalarni qoldiradi va ulanishlar limiti tugaydi.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Ma'lumotlar bazasiga ulanildi");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Ma'lumotlar bazasi ulanishi yopildi");
  }

  /** Readiness probe uchun eng arzon so'rov. */
  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
