import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@barff/db';
import { type NotificationMessage, type NotificationProvider } from './notification.provider';

/**
 * Zaxira provayder: xabarni faqat logga yozadi.
 *
 * NEGA kerak: email/SMS provayderlari hali tanlanmagan (Q12), lekin
 * hodisalar allaqachon yuz bermoqda. Bu provayder bilan oqim TO'LIQ
 * ishlaydi va testlarda ham aynan shu yo'l tekshiriladi — keyinchalik
 * haqiqiy provayder qo'shilganda faqat ro'yxatga yana bitta sinf
 * qo'shiladi, chaqiruvchi kod o'zgarmaydi.
 *
 * Xabar tanasi loglanadi, shuning uchun unga parol yoki token
 * QO'YILMAYDI (CLAUDE.md §12).
 */
@Injectable()
export class LogProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  private readonly logger = new Logger(LogProvider.name);

  isConfigured(): boolean {
    return true;
  }

  send(message: NotificationMessage): Promise<void> {
    this.logger.log(
      `[MOCK provayder] ${message.event} -> ${message.address}: ${message.subject ?? ''}`,
    );

    return Promise.resolve();
  }
}
