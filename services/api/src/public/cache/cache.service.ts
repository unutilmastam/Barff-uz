import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Kesh nomlari.
 *
 * Har bir nom o'z VERSIYA hisoblagichiga ega. Admin yozuvni
 * o'zgartirganda versiya bittaga oshadi va o'sha nomdagi barcha eski
 * kalitlar bir zumda ahamiyatsiz bo'lib qoladi.
 */
export const CACHE_NAMESPACES = ['products', 'news', 'content'] as const;
export type CacheNamespace = (typeof CACHE_NAMESPACES)[number];

/**
 * Ommaviy javoblar keshi.
 *
 * NEGA versiya hisoblagichi, `SCAN` + `DEL` emas: `SCAN` katta bazada
 * sekin va atomar emas — tozalash davomida eski qiymat qaytib turishi
 * mumkin. Versiyani bitta `INCR` bilan oshirish esa bir amalda va
 * darhol ta'sir qiladi (CLAUDE.md §26).
 *
 * Kesh YO'QOLSA ham ilova ishlashda davom etadi: Redis xatolari
 * yutiladi va so'rov to'g'ridan-to'g'ri bazaga tushadi. Kesh tezlik
 * uchun, to'g'rilik uchun emas.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  private versionKey(namespace: CacheNamespace): string {
    return `cache:ver:${namespace}`;
  }

  private async version(namespace: CacheNamespace): Promise<string> {
    try {
      const value = await this.redis.get(this.versionKey(namespace));
      return value ?? '1';
    } catch {
      // Redis yetib bo'lmasa, versiya "0" — kalit har safar boshqacha
      // bo'ladi va kesh amalda o'chib qoladi. Bu to'g'ri xulq.
      return '0';
    }
  }

  private async buildKey(namespace: CacheNamespace, suffix: string): Promise<string> {
    return `cache:${namespace}:v${await this.version(namespace)}:${suffix}`;
  }

  /**
   * Keshdan o'qiydi, bo'lmasa `produce()` ni chaqirib saqlaydi.
   *
   * `ttlSeconds` MAJBURIY: muddatsiz kesh eng oson unutiladigan va eng
   * uzoq zarar keltiradigan narsa.
   */
  async wrap<T>(
    namespace: CacheNamespace,
    suffix: string,
    ttlSeconds: number,
    produce: () => Promise<T>,
  ): Promise<T> {
    const key = await this.buildKey(namespace, suffix);

    try {
      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Kesh yetib bo'lmasa, so'rov to'g'ridan-to'g'ri bazaga tushadi.
      this.logger.warn(`Keshdan o'qib bo'lmadi: ${key}`);
    }

    const value = await produce();

    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // Saqlab bo'lmasa ham javob berilaveradi.
      this.logger.warn(`Keshga yozib bo'lmadi: ${key}`);
    }

    return value;
  }

  /**
   * Nom bo'yicha keshni bekor qiladi.
   *
   * Admin yozuvni o'zgartirgandan KEYIN, javob qaytarilishidan OLDIN
   * chaqiriladi — shunda keyingi so'rov yangi ma'lumotni oladi.
   */
  async invalidate(namespace: CacheNamespace): Promise<void> {
    try {
      await this.redis.incr(this.versionKey(namespace));
    } catch {
      this.logger.warn(`Keshni bekor qilib bo'lmadi: ${namespace}`);
    }
  }

  /** Testlar uchun: joriy versiyani o'qish. */
  currentVersion(namespace: CacheNamespace): Promise<string> {
    return this.version(namespace);
  }
}
