import { Injectable } from '@nestjs/common';
import { AppConfig } from '../config/app.config';
import { RedisService } from '../redis/redis.service';

/**
 * Kirish urinishlarini cheklash.
 *
 * Hisoblagich IKKI kalit bo'yicha yuritiladi:
 *  - email — bitta akkauntni parol tanlash orqali sindirishdan himoya;
 *  - IP    — bitta manbadan ko'p akkauntni sinab ko'rishdan himoya.
 *
 * S02 dagi umumiy rate limiter so'rovlar SONINI cheklaydi; bu esa aynan
 * MUVAFFAQIYATSIZ kirishlarni hisoblaydi, shuning uchun to'g'ri parol bilan
 * kirayotgan foydalanuvchi bloklanmaydi.
 */
@Injectable()
export class LoginAttemptService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfig,
  ) {}

  private emailKey(email: string): string {
    return `auth:fail:email:${email.toLowerCase()}`;
  }

  private ipKey(ip: string): string {
    return `auth:fail:ip:${ip}`;
  }

  async isLocked(email: string, ip: string): Promise<boolean> {
    const { maxAttempts, maxAttemptsPerIp } = this.config.loginThrottle;

    const [byEmail, byIp] = await this.redis.client.mget(this.emailKey(email), this.ipKey(ip));

    return Number(byEmail ?? 0) >= maxAttempts || Number(byIp ?? 0) >= maxAttemptsPerIp;
  }

  /** Testlar va administrator aralashuvi uchun: IP hisoblagichini tozalaydi. */
  async resetIp(ip: string): Promise<void> {
    await this.redis.client.del(this.ipKey(ip));
  }

  /** Muvaffaqiyatsiz urinishni qayd etadi va joriy sonini qaytaradi. */
  async registerFailure(email: string, ip: string): Promise<number> {
    const { lockSeconds } = this.config.loginThrottle;

    const results = await this.redis.client
      .multi()
      .incr(this.emailKey(email))
      .expire(this.emailKey(email), lockSeconds)
      .incr(this.ipKey(ip))
      .expire(this.ipKey(ip), lockSeconds)
      .exec();

    const emailCount = results?.[0]?.[1];
    return typeof emailCount === 'number' ? emailCount : 0;
  }

  /** Muvaffaqiyatli kirishdan keyin hisoblagichlar tozalanadi. */
  async reset(email: string, ip: string): Promise<void> {
    await this.redis.client.del(this.emailKey(email), this.ipKey(ip));
  }
}
