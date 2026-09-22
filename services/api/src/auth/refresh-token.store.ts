import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Refresh token'lar ro'yxati (Redis).
 *
 * JWT o'zi bekor qilinmaydi — imzo to'g'ri bo'lsa, u muddati tugaguncha
 * amal qiladi. Shuning uchun "amaldagi" refresh token'lar ro'yxati alohida
 * saqlanadi: chiqib ketish (logout) yoki almashtirish (rotation) shu
 * ro'yxatdan o'chirish orqali ishlaydi.
 *
 * Kalitlar:
 *   `auth:rt:<userId>:<jti>`     -> oila id   (bitta token nusxasi)
 *   `auth:rt:fam:<userId>:<fam>` -> '1'       (oila amal qilyaptimi)
 */
@Injectable()
export class RefreshTokenStore {
  private readonly logger = new Logger(RefreshTokenStore.name);

  constructor(private readonly redis: RedisService) {}

  private tokenKey(userId: string, jti: string): string {
    return `auth:rt:${userId}:${jti}`;
  }

  private familyKey(userId: string, family: string): string {
    return `auth:rt:fam:${userId}:${family}`;
  }

  async save(userId: string, jti: string, family: string, ttlSeconds: number): Promise<void> {
    await this.redis.client
      .multi()
      .set(this.tokenKey(userId, jti), family, 'EX', ttlSeconds)
      .set(this.familyKey(userId, family), '1', 'EX', ttlSeconds)
      .exec();
  }

  /**
   * Token'ni bir martalik ishlatadi: mavjud bo'lsa o'chirib, `true` qaytaradi.
   *
   * O'chirish va tekshirish ATOMAR bo'lishi shart. Aks holda bir vaqtda
   * kelgan ikki so'rov bitta token bilan ikkita yangi juftlik olishi mumkin
   * edi — `getdel` shuni oldini oladi.
   */
  async consume(userId: string, jti: string): Promise<string | null> {
    return this.redis.client.getdel(this.tokenKey(userId, jti));
  }

  async isFamilyActive(userId: string, family: string): Promise<boolean> {
    return (await this.redis.client.exists(this.familyKey(userId, family))) === 1;
  }

  /**
   * Butun oilani bekor qiladi.
   *
   * Allaqachon ishlatilgan refresh token qayta taqdim etilsa — bu yo tarmoq
   * xatosi, yo token o'g'irlangani. Ikkinchi ehtimolni jiddiy qabul qilib,
   * o'sha sessiyaning barcha token'lari bekor qilinadi: haqiqiy foydalanuvchi
   * qayta kiradi, o'g'ri esa kira olmaydi.
   */
  async revokeFamily(userId: string, family: string): Promise<void> {
    await this.redis.client.del(this.familyKey(userId, family));
    this.logger.warn(`Refresh token oilasi bekor qilindi: user=${userId}`);
  }

  /** Foydalanuvchining BARCHA sessiyalarini bekor qiladi (parol almashtirish, bloklash). */
  async revokeAllForUser(userId: string): Promise<void> {
    const pattern = `auth:rt:*${userId}:*`;
    const stream = this.redis.client.scanStream({ match: pattern, count: 100 });

    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await this.redis.client.del(...keys);
    }
  }
}
