import { Injectable } from '@nestjs/common';
import { AppConfig } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Kirish urinishlarini cheklash (PostgreSQL).
 *
 * Hisoblagich IKKI kalit bo'yicha yuritiladi:
 *  - email — bitta akkauntni parol tanlash orqali sindirishdan himoya;
 *  - IP    — bitta manbadan ko'p akkauntni sinab ko'rishdan himoya.
 *
 * S02 dagi umumiy rate limiter so'rovlar SONINI cheklaydi; bu esa aynan
 * MUVAFFAQIYATSIZ kirishlarni hisoblaydi, shuning uchun to'g'ri parol
 * bilan kirayotgan foydalanuvchi bloklanmaydi.
 *
 * NEGA BAZADA: bu xavfsizlik holati, kesh emas —
 * `refresh-token.store.ts` dagi izohga qarang. Redis'da `INCR` +
 * `EXPIRE` edi; bazada muddat o'zi o'chmaydi, shuning uchun o'qishda
 * `expiresAt` tekshiriladi va yozishda eski qatorlar tozalanadi.
 */
@Injectable()
export class LoginAttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  private emailKey(email: string): string {
    return `email:${email.toLowerCase()}`;
  }

  private ipKey(ip: string): string {
    return `ip:${ip}`;
  }

  async isLocked(email: string, ip: string): Promise<boolean> {
    const { maxAttempts, maxAttemptsPerIp } = this.config.loginThrottle;

    const rows = await this.prisma.loginAttempt.findMany({
      where: {
        key: { in: [this.emailKey(email), this.ipKey(ip)] },
        // Muddati o'tgan hisoblagich kuchini yo'qotadi.
        expiresAt: { gt: new Date() },
      },
      select: { key: true, count: true },
    });

    const byEmail = rows.find((row) => row.key === this.emailKey(email))?.count ?? 0;
    const byIp = rows.find((row) => row.key === this.ipKey(ip))?.count ?? 0;

    return byEmail >= maxAttempts || byIp >= maxAttemptsPerIp;
  }

  /** Testlar va administrator aralashuvi uchun: IP hisoblagichini tozalaydi. */
  async resetIp(ip: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({ where: { key: this.ipKey(ip) } });
  }

  /** Muvaffaqiyatsiz urinishni qayd etadi va email bo'yicha joriy sonini qaytaradi. */
  async registerFailure(email: string, ip: string): Promise<number> {
    const { lockSeconds } = this.config.loginThrottle;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lockSeconds * 1000);

    // Muddati o'tgan qatorlarni tozalash — Redis'dagi `EX` ning o'rniga.
    await this.prisma.loginAttempt.deleteMany({ where: { expiresAt: { lt: now } } });

    const [emailRow] = await this.prisma.$transaction([
      this.bump(this.emailKey(email), expiresAt),
      this.bump(this.ipKey(ip), expiresAt),
    ]);

    return emailRow.count;
  }

  /** Muvaffaqiyatli kirishdan keyin hisoblagichlar tozalanadi. */
  async reset(email: string, ip: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({
      where: { key: { in: [this.emailKey(email), this.ipKey(ip)] } },
    });
  }

  /**
   * Hisoblagichni bittaga oshiradi va muddatini yangilaydi.
   *
   * Muddat HAR urinishda qayta qo'yiladi (surilma oyna) — Redis'dagi
   * `INCR` + `EXPIRE` juftligi aynan shunday ishlagan: tinmay urinayotgan
   * hujumchi blokdan chiqa olmaydi.
   */
  private bump(key: string, expiresAt: Date) {
    return this.prisma.loginAttempt.upsert({
      where: { key },
      create: { key, count: 1, expiresAt },
      update: { count: { increment: 1 }, expiresAt },
      select: { count: true },
    });
  }
}
