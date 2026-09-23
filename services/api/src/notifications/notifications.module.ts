import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { LogProvider } from './providers/log.provider';
import {
  NOTIFICATION_PROVIDERS,
  type NotificationProvider,
} from './providers/notification.provider';
import { TelegramProvider } from './providers/telegram.provider';

/**
 * Bildirishnoma provayderlari (CLAUDE.md §21).
 *
 * Ro'yxat sifatida beriladi, chunki bitta hodisa bir nechta kanalga
 * ketishi mumkin. Yangi kanal qo'shish = shu ro'yxatga bitta sinf
 * qo'shish; `NotificationsService` o'zgarmaydi.
 *
 * Sozlanmagan provayder ro'yxatda QOLADI va `isConfigured()` orqali
 * o'zini chetga oladi — shunda "Telegram nega ishlamadi?" degan savol
 * kodni emas, sozlamani tekshirishga olib boradi.
 */
@Global()
@Module({
  providers: [
    TelegramProvider,
    LogProvider,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (telegram: TelegramProvider, log: LogProvider): NotificationProvider[] => [
        telegram,
        log,
      ],
      inject: [TelegramProvider, LogProvider],
    },
    NotificationsService,
  ],
  exports: [NotificationsService, NOTIFICATION_PROVIDERS],
})
export class NotificationsModule {}
