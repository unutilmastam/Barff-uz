import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@barff/db';
import { type NotificationMessage, type NotificationProvider } from './notification.provider';

/**
 * Telegram Bot API orqali xabar.
 *
 * Token `TELEGRAM_BOT_TOKEN` da. U LOGLARGA TUSHMAYDI: xato xabarida
 * ham faqat holat kodi ko'rsatiladi, manzil emas — token manzil
 * ichida bo'ladi (CLAUDE.md §12).
 */
@Injectable()
export class TelegramProvider implements NotificationProvider {
  readonly channel = NotificationChannel.TELEGRAM;

  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private readonly config: ConfigService) {}

  private token(): string | undefined {
    const value = this.config.get<string>('TELEGRAM_BOT_TOKEN');

    return value !== undefined && value.length > 0 ? value : undefined;
  }

  isConfigured(): boolean {
    return this.token() !== undefined;
  }

  async send(message: NotificationMessage): Promise<void> {
    const token = this.token();
    if (token === undefined) {
      throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.address,
        text:
          message.subject !== undefined ? `${message.subject}\n\n${message.body}` : message.body,
        disable_web_page_preview: true,
      }),
      // Provayder javob bermasa butun so'rov osilib qolmasligi kerak.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // Javob tanasi token'ni takrorlashi mumkin — faqat kod yoziladi.
      throw new Error(`Telegram javobi: ${response.status}`);
    }

    this.logger.debug(`Telegram xabari yuborildi: ${message.event}`);
  }
}
