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

  /**
   * Ulanish urinib ko'riladi, lekin MUVAFFAQIYATSIZLIK ilovani o'ldirmaydi.
   *
   * `$connect()` xatosi ko'tarilsa, baza bir lahzaga yetib bo'lmaydigan
   * bo'lgan paytda deploy qilingan har bir task darhol quladi va konteyner
   * cheksiz qayta ishga tushish siklida qolardi. Buning o'rniga ilova
   * ko'tariladi, readiness esa `database: down` deb ko'rsatadi — orkestrator
   * unga trafik yubormaydi, baza qaytganda esa hammasi o'zi tiklanadi.
   *
   * Noto'g'ri sozlangan `DATABASE_URL` ham yo'qolib ketmaydi: readiness
   * doimiy qizil bo'lib turadi va deploy "stable" holatiga o'tmaydi.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log("Ma'lumotlar bazasiga ulanildi");
    } catch (error) {
      this.logger.error(
        "Ma'lumotlar bazasiga ulanib bo'lmadi — ilova ishlaydi, readiness qizil bo'ladi",
        error instanceof Error ? error.message : String(error),
      );
    }
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
