import { type NotificationChannel } from '@barff/db';

export interface NotificationMessage {
  /** `lead.created` kabi hodisa nomi — loglarda izlash uchun. */
  event: string;
  /** Tashqi manzil: Telegram chat id, email, telefon. */
  address: string;
  subject?: string | undefined;
  body: string;
}

/**
 * Bildirishnoma provayderi (CLAUDE.md §21).
 *
 * Interfeys ATAYIN tor: ilova bironta vendor'ga bog'lanib qolmasligi
 * kerak. Telegram bugun, email ertaga, SMS keyinroq — chaqiruvchi kod
 * uchun farqi yo'q.
 *
 * `send` xato tashlasa, chaqiruvchi uni YOZIB QO'YADI va yuqoriga
 * o'tkazmaydi: bildirishnoma yuborilmagani uchun lead yo'qolmasligi
 * kerak.
 */
export interface NotificationProvider {
  readonly channel: NotificationChannel;

  /** Provayder sozlanganmi (kalitlar berilganmi). */
  isConfigured(): boolean;

  send(message: NotificationMessage): Promise<void>;
}

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');
