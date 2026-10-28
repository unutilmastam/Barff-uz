import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

export interface SystemErrorReport {
  method: string;
  /** To'liq URL — so'rov satri (`?token=...`) bu yerda KESIB TASHLANADI. */
  url: string;
  status: number;
  requestId: string;
  /** Xato sinfining nomi (`PrismaClientKnownRequestError`). Xabari yuborilmaydi. */
  errorName: string;
}

/**
 * Tizim xatosi haqida ogohlantirish (CLAUDE.md §21: "system error").
 *
 * Maqsad — egasi 500 xatoni foydalanuvchi shikoyatidan EMAS, o'zi
 * birinchi bo'lib bilishi. Shu bilan birga ogohlantirish o'zi muammo
 * bo'lmasligi kerak:
 *
 *  - QAYTA-QAYTA YUBORILMAYDI: bir xil xato (`method + yo'l + status`)
 *    10 daqiqada bir marta; umumiy chegara soatiga 20 ta. Baza o'chib
 *    qolsa har so'rov 500 beradi — Telegram'ni minglab xabar bilan
 *    to'ldirmaslik uchun.
 *  - MA'LUMOT SIZMAYDI: xato XABARI yuborilmaydi (Prisma xabarlarida
 *    qiymatlar, ya'ni dilerning telefoni yoki nomi bo'lishi mumkin),
 *    faqat xato sinfi va `requestId`; to'liq izi logda shu ID bilan.
 *  - ASOSIY JAVOBNI TO'XTATMAYDI: bu yerdagi har qanday xato yutiladi.
 *
 * Throttling jarayon XOTIRASIDA. cPanel'da bitta jarayon, shuning uchun
 * yetarli; ko'p nusxada har biri o'z chegarasini yuritadi (Q19 kabi).
 */
@Injectable()
export class SystemAlertService {
  private readonly logger = new Logger(SystemAlertService.name);

  static readonly SAME_ERROR_INTERVAL_MS = 10 * 60 * 1000;
  static readonly MAX_PER_HOUR = 20;

  private readonly lastSent = new Map<string, number>();
  private sentTimes: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Qaytarilgan qiymat: ogohlantirish yuborildimi (testlar uchun). */
  async reportError(report: SystemErrorReport, now = Date.now()): Promise<boolean> {
    try {
      const route = report.url.split('?')[0] ?? report.url;
      const signature = `${report.method} ${route} ${report.status}`;

      if (!this.allow(signature, now)) return false;

      await this.notifications.notify({
        event: 'system.error',
        subject: `BARFF: tizim xatosi (${report.status})`,
        body: [
          `${report.method} ${route} -> ${report.status}`,
          `Xato: ${report.errorName}`,
          `So'rov ID: ${report.requestId}`,
          `Batafsil: serverning logida shu so'rov ID bo'yicha qidiring.`,
        ].join('\n'),
        payload: { requestId: report.requestId, status: report.status },
        ...(await this.targets()),
      });

      return true;
    } catch (error) {
      this.logger.warn(
        `Tizim xatosi haqida ogohlantirib bo'lmadi: ${error instanceof Error ? error.name : "noma'lum"}`,
      );
      return false;
    }
  }

  private allow(signature: string, now: number): boolean {
    this.sentTimes = this.sentTimes.filter((time) => now - time < 60 * 60 * 1000);
    if (this.sentTimes.length >= SystemAlertService.MAX_PER_HOUR) return false;

    const last = this.lastSent.get(signature);
    if (last !== undefined && now - last < SystemAlertService.SAME_ERROR_INTERVAL_MS) return false;

    this.lastSent.set(signature, now);
    this.sentTimes.push(now);

    // Xotira o'smasligi uchun eskilarini tozalaymiz.
    if (this.lastSent.size > 500) {
      for (const [key, time] of this.lastSent) {
        if (now - time >= SystemAlertService.SAME_ERROR_INTERVAL_MS) this.lastSent.delete(key);
      }
    }

    return true;
  }

  /** Adminlar in-app bildirishnoma oladi; tashqi manzillar `notifications.system` sozlamasidan (Q26). */
  private async targets() {
    const [setting, admins] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'notifications.system' } }),
      this.prisma.user.findMany({
        where: { isActive: true, deletedAt: null, roles: { some: { role: { code: 'ADMIN' } } } },
        select: { id: true },
      }),
    ]);

    const value = (setting?.value ?? {}) as Record<string, unknown>;
    const addresses: Record<string, string> = {};

    for (const [channel, key] of [
      ['TELEGRAM', 'telegramChatId'],
      ['EMAIL', 'email'],
    ] as const) {
      const address = value[key];
      if (typeof address === 'string' && address.length > 0 && !address.startsWith('REPLACE_')) {
        addresses[channel] = address;
      }
    }

    return {
      ...(Object.keys(addresses).length > 0 ? { addresses } : {}),
      ...(admins.length > 0 ? { recipientIds: admins.map((user) => user.id) } : {}),
    };
  }
}
