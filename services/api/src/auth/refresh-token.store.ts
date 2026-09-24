import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Amaldagi refresh token'lar ro'yxati (PostgreSQL).
 *
 * JWT o'zi bekor qilinmaydi — imzo to'g'ri bo'lsa, u muddati tugaguncha
 * amal qiladi. Shuning uchun "amaldagi" refresh token'lar ro'yxati alohida
 * saqlanadi: chiqib ketish (logout) yoki almashtirish (rotation) shu
 * ro'yxatdan o'chirish orqali ishlaydi.
 *
 * ================== NEGA BAZADA, REDIS'DA EMAS ==================
 *
 * Bu KESH emas, XAVFSIZLIK holati. Redis'da saqlanganda ikki muammo bor
 * edi:
 *
 *   1. Redis qayta ishga tushsa ro'yxat yo'qolardi va BARCHA
 *      foydalanuvchilar tizimdan chiqib ketardi.
 *   2. Joylash muhitida (cPanel) Redis umuman yo'q
 *      (`docs/OPEN-QUESTIONS.md` Q18), va uni "ixtiyoriy" qilish
 *      xavfsizlik tekshiruvini olib tashlash bo'lardi (CLAUDE.md §30).
 *
 * Bazada muddat AVTOMATIK o'chmaydi, shuning uchun har o'qishda
 * `expiresAt` tekshiriladi va yozishda muddati o'tgan qatorlar
 * tozalanadi.
 */
@Injectable()
export class RefreshTokenStore {
  private readonly logger = new Logger(RefreshTokenStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, jti: string, family: string, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({ data: { userId, jti, family, expiresAt } }),
      /*
        Oila allaqachon bor bo'lsa muddati UZAYTIRILADI — Redis'dagi
        `SET ... EX` xatti-harakati aynan shunday edi.
      */
      this.prisma.refreshTokenFamily.upsert({
        where: { userId_family: { userId, family } },
        create: { userId, family, expiresAt },
        update: { expiresAt },
      }),
    ]);

    await this.purgeExpired();
  }

  /**
   * Token'ni BIR MARTALIK ishlatadi: mavjud bo'lsa o'chirib, oila
   * nomini qaytaradi.
   *
   * O'chirish va tekshirish ATOMAR bo'lishi shart. Aks holda bir vaqtda
   * kelgan ikki so'rov bitta token bilan ikkita yangi juftlik olishi
   * mumkin edi. Prisma'ning `delete` chaqirig'i bitta `DELETE ...
   * RETURNING` ga aylanadi va qator topilmasa xato beradi — ya'ni
   * "tekshir, keyin o'chir" oralig'i umuman yo'q.
   */
  async consume(userId: string, jti: string): Promise<string | null> {
    try {
      const row = await this.prisma.refreshToken.delete({
        where: { userId_jti: { userId, jti } },
        select: { family: true, expiresAt: true },
      });

      // Muddati o'tgan token qatori qolib ketgan bo'lishi mumkin.
      return row.expiresAt.getTime() > Date.now() ? row.family : null;
    } catch {
      // Qator yo'q — token allaqachon ishlatilgan yoki hech qachon bo'lmagan.
      return null;
    }
  }

  async isFamilyActive(userId: string, family: string): Promise<boolean> {
    const row = await this.prisma.refreshTokenFamily.findFirst({
      where: { userId, family, expiresAt: { gt: new Date() } },
      select: { id: true },
    });

    return row !== null;
  }

  /**
   * Butun oilani bekor qiladi.
   *
   * Allaqachon ishlatilgan refresh token qayta taqdim etilsa — bu yo
   * tarmoq xatosi, yo token o'g'irlangani. Ikkinchi ehtimolni jiddiy
   * qabul qilib, o'sha sessiyaning barcha token'lari bekor qilinadi:
   * haqiqiy foydalanuvchi qayta kiradi, o'g'ri esa kira olmaydi.
   */
  async revokeFamily(userId: string, family: string): Promise<void> {
    /*
      FAQAT OILA qatori o'chiriladi, oiladagi token qatorlari EMAS.

      Bu ataylab: bekor qilingan sessiyadagi token keyin taqdim
      etilsa, u ro'yxatda TOPILADI va oila yo'qligi aniqlanadi —
      natijada foydalanuvchi "sessiya bekor qilingan"
      (`SESSION_REVOKED`) degan aniq xabar oladi. Token qatorlari ham
      o'chirilsa, u "token yaroqsiz" (`INVALID_REFRESH_TOKEN`) ga
      aylanardi va haqiqiy sabab yo'qolardi. Buni ko'chirish paytida
      test ushladi.

      Qolgan qatorlar muddati tugagach `purgeExpired()` da tozalanadi.
    */
    await this.prisma.refreshTokenFamily.deleteMany({ where: { userId, family } });

    this.logger.warn(`Refresh token oilasi bekor qilindi: user=${userId}`);
  }

  /** Foydalanuvchining BARCHA sessiyalarini bekor qiladi (parol almashtirish, bloklash). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshTokenFamily.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
  }

  /**
   * Muddati o'tgan qatorlarni olib tashlaydi.
   *
   * Redis buni o'zi qilardi (`EX`). Bazada esa kimdir tozalashi kerak:
   * bu yozish paytida, arzon `DELETE` bilan bajariladi — alohida
   * rejalashtiruvchi (cron) talab qilmaydi.
   */
  private async purgeExpired(): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.refreshTokenFamily.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
  }
}
