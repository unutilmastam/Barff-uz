import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, type Prisma } from '@barff/db';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_PROVIDERS,
  type NotificationProvider,
} from './providers/notification.provider';

export interface NotifyInput {
  event: string;
  subject?: string | undefined;
  body: string;
  payload?: Prisma.InputJsonValue | undefined;
  /** Tashqi kanallar uchun manzillar: `{ TELEGRAM: '123', EMAIL: 'a@b.uz' }`. */
  addresses?: Partial<Record<NotificationChannel, string>> | undefined;
  /** In-app bildirishnoma oladigan foydalanuvchilar. */
  recipientIds?: string[] | undefined;
}

/**
 * Bildirishnomalar (CLAUDE.md §21).
 *
 * ASOSIY QOIDA: bildirishnoma yuborilmagani ASOSIY amalni buzmaydi.
 * Lead saqlandi — demak ish bajarildi; Telegram ishlamay qolsa, buni
 * `notifications` jadvalidagi `FAILED` yozuv ko'rsatadi, lekin
 * tashrifchi xato ko'rmaydi.
 *
 * Shuning uchun har bir urinish AVVAL bazaga yoziladi, keyin
 * yuboriladi: provayder javob bermay qolsa ham, nima yuborilmagani
 * yo'qolmaydi.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDERS) private readonly providers: NotificationProvider[],
  ) {}

  /**
   * Bildirishnoma yuborish — HECH QACHON XATO TASHLAMAYDI.
   *
   * Bu sinf boshidagi kafolat edi, lekin u AMALDA BAJARILMAGAN edi:
   * `sendInApp` ichidagi baza xatosi yuqoriga chiqib ketardi va
   * ASOSIY amalni yiqitardi. Aniq holat CI'da ko'rindi — diler
   * arizasi `202` o'rniga `500` qaytardi, garchi diler BAZAGA
   * YOZILGAN bo'lsa ham: qabul qiluvchilar ro'yxati o'qilgandan
   * KEYIN, lekin yozuv kiritilishidan OLDIN o'sha foydalanuvchi
   * o'chirilgan edi (parallel test), natijada tashqi kalit buzildi.
   *
   * Production'da ham xuddi shunday: admin o'chirilgan lahzada
   * kelgan ariza yo'qolardi. Ariza saqlangan — demak ish bajarilgan;
   * bildirishnoma esa ikkinchi darajali.
   *
   * Shuning uchun har ikkala yo'nalish ALOHIDA o'raladi: biri
   * yiqilsa, ikkinchisi baribir bajariladi.
   */
  async notify(input: NotifyInput): Promise<void> {
    await Promise.all([
      this.safely('in-app', () => this.sendInApp(input)),
      this.safely('tashqi', () => this.sendExternal(input)),
    ]);
  }

  /** Xatoni yutadi va LOGGA yozadi — jim yo'qotmaydi. */
  private async safely(label: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.logger.error(
        `Bildirishnoma yuborilmadi (${label})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sendInApp(input: NotifyInput): Promise<void> {
    const recipients = input.recipientIds ?? [];
    if (recipients.length === 0) return;

    // In-app bildirishnoma — bu yozuvning O'ZI. Yuborish kerak emas,
    // shuning uchun u darhol `SENT`.
    await this.prisma.notification.createMany({
      data: recipients.map((recipientId) => ({
        event: input.event,
        channel: NotificationChannel.IN_APP,
        recipientId,
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        body: input.body,
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      })),
    });
  }

  private async sendExternal(input: NotifyInput): Promise<void> {
    const addresses = input.addresses ?? {};

    await Promise.all(
      this.providers.map(async (provider) => {
        const address = addresses[provider.channel];
        // Manzil berilmagan yoki provayder sozlanmagan — bu xato EMAS,
        // shunchaki bu kanal ishlatilmaydi.
        if (address === undefined || address.length === 0) return;
        if (!provider.isConfigured()) return;

        const record = await this.prisma.notification.create({
          data: {
            event: input.event,
            channel: provider.channel,
            recipientAddress: address,
            ...(input.subject !== undefined ? { subject: input.subject } : {}),
            body: input.body,
            ...(input.payload !== undefined ? { payload: input.payload } : {}),
            status: NotificationStatus.PENDING,
          },
        });

        try {
          await provider.send({
            event: input.event,
            address,
            subject: input.subject,
            body: input.body,
          });

          await this.prisma.notification.update({
            where: { id: record.id },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
              attempts: { increment: 1 },
            },
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);

          // Xato YUQORIGA O'TKAZILMAYDI: asosiy amal (lead saqlash)
          // bildirishnomaga bog'liq bo'lmasligi kerak.
          this.logger.warn(`${provider.channel} yuborilmadi (${input.event}): ${reason}`);

          await this.prisma.notification.update({
            where: { id: record.id },
            data: {
              status: NotificationStatus.FAILED,
              error: reason.slice(0, 500),
              attempts: { increment: 1 },
            },
          });
        }
      }),
    );
  }

  /** Foydalanuvchining o'qilmagan in-app bildirishnomalari. */
  listUnread(recipientId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { recipientId, channel: NotificationChannel.IN_APP, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(recipientId: string, id: string): Promise<void> {
    // `recipientId` shart bilan: boshqa odamning bildirishnomasini
    // o'qilgan deb belgilab bo'lmaydi.
    await this.prisma.notification.updateMany({
      where: { id, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
