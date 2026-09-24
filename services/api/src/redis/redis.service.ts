import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app.config';

/** `quit()` javob bermasa, shuncha kutib turib majburan uzamiz. */
const SHUTDOWN_TIMEOUT_MS = 2_000;

/**
 * Bitta umumiy Redis ulanishi — FAQAT KESH uchun.
 *
 * ================== REDIS IXTIYORIY ==================
 *
 * Avval bu yerda xavfsizlik holati ham saqlanardi (refresh token'lar,
 * kirish urinishlari). Ular PostgreSQL ga ko'chirildi, chunki Redis
 * qayta ishga tushsa ular yo'qolardi va joylash muhitida (cPanel)
 * Redis umuman yo'q (`docs/OPEN-QUESTIONS.md` Q18).
 *
 * Endi Redis'da faqat KESH bor, shuning uchun `REDIS_URL` berilmasa
 * ilova baribir ishlaydi — har bir so'rov to'g'ridan-to'g'ri bazaga
 * tushadi, ya'ni sekinroq, lekin TO'G'RI. Bu xavfsizlik tekshiruvini
 * olib tashlash EMAS: olib tashlanadigan narsa qolmadi.
 *
 * Kesh amallari xatoni HECH QACHON yuqoriga chiqarmaydi: kesh tezlik
 * uchun, to'g'rilik uchun emas.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  /** `REDIS_URL` berilgan bo'lsa `true`. */
  readonly enabled: boolean;

  private readonly redis: Redis | null;

  constructor(config: AppConfig) {
    const url = config.redisUrl;

    if (url === undefined) {
      this.enabled = false;
      this.redis = null;
      this.logger.warn("REDIS_URL sozlanmagan — kesh O'CHIQ, so'rovlar bazaga tushadi");
      return;
    }

    this.enabled = true;
    this.redis = new Redis(url, {
      // API Redis yo'qligi sababli ishga tushmay qolmasligi kerak: readiness
      // probe uni "tayyor emas" deb ko'rsatadi, ulanish esa fonda tiklanadi.
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });

    this.redis.on('error', (error: Error) => {
      // Ulanish uzilganda ioredis xatoni takroran chiqaradi — `error`
      // darajasida emas, `warn` da yozamiz, aks holda log to'lib ketadi.
      this.logger.warn(`Redis ulanish xatosi: ${error.message}`);
    });
  }

  async ping(): Promise<boolean> {
    if (this.redis === null) return false;

    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  /** Keshdan o'qish. Redis yo'q yoki yetib bo'lmasa — `null`. */
  async get(key: string): Promise<string | null> {
    if (this.redis === null) return null;

    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  /** Keshga yozish. Muvaffaqiyatsizlik JIM o'tadi. */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.redis === null) return;

    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      // Kesh tezlik uchun — yozib bo'lmasa ham javob beriladi.
    }
  }

  /**
   * Hisoblagichni oshiradi va yangi qiymatini qaytaradi.
   *
   * Redis yo'q bo'lsa `null` qaytadi — chaqiruvchi buni "versiya
   * noma'lum" deb qabul qiladi va kesh amalda o'chib qoladi.
   */
  async incr(key: string): Promise<number | null> {
    if (this.redis === null) return null;

    try {
      return await this.redis.incr(key);
    } catch {
      return null;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (this.redis === null || keys.length === 0) return;

    try {
      await this.redis.del(...keys);
    } catch {
      // Kesh yozuvi qolib ketsa ham muddati tugagach o'chadi.
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
    if (this.redis === null || this.redis.status === 'end') return;

    try {
      await Promise.race([
        this.redis.quit(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('quit timeout')), SHUTDOWN_TIMEOUT_MS).unref(),
        ),
      ]);
    } catch {
      this.logger.warn("Redis ulanishi to'g'ri yopilmadi, majburan uzilyapti");
    } finally {
      this.redis.disconnect();
    }
  }
}
