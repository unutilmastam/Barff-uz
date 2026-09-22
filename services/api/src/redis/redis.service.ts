import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app.config';

/** `quit()` javob bermasa, shuncha kutib turib majburan uzamiz. */
const SHUTDOWN_TIMEOUT_MS = 2_000;

/**
 * Bitta umumiy Redis ulanishi.
 *
 * S04 da refresh token'larni bekor qilish, S11 da kesh uchun ishlatiladi.
 * Hozircha readiness tekshiruvi undan foydalanadi.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      // API Redis yo'qligi sababli ishga tushmay qolmasligi kerak: readiness
      // probe uni "tayyor emas" deb ko'rsatadi, ulanish esa fonda tiklanadi.
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });

    this.client.on('error', (error: Error) => {
      // Ulanish uzilganda ioredis xatoni takroran chiqaradi — `error`
      // darajasida emas, `warn` da yozamiz, aks holda log to'lib ketadi.
      this.logger.warn(`Redis ulanish xatosi: ${error.message}`);
    });
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * To'xtatish HECH QACHON osilib qolmasligi kerak.
   *
   * Redis mavjud bo'lmaganda ioredis qayta ulanish siklida turadi va `quit()`
   * javobsiz qoladi — natijada ECS graceful shutdown'ni kutib o'tirib,
   * oxirida konteynerni SIGKILL bilan o'ldiradi. Shuning uchun `quit()`
   * vaqt bilan chegaralanadi va keyin ulanish majburan uziladi.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') return;

    try {
      await Promise.race([
        this.client.quit(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('quit timeout')), SHUTDOWN_TIMEOUT_MS).unref(),
        ),
      ]);
    } catch {
      this.logger.warn("Redis ulanishi to'g'ri yopilmadi, majburan uzilyapti");
    } finally {
      this.client.disconnect();
    }
  }
}
