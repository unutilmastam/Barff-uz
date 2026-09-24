import { Global, Logger, Module } from '@nestjs/common';
import { AppConfig } from '../../config/app.config';
import { FilesystemStorage } from './filesystem.storage';
import { MemoryStorage } from './memory.storage';
import { S3Storage } from './s3.storage';
import { STORAGE_ADAPTER, type StorageAdapter } from './storage.adapter';

/**
 * Saqlash provayderini tanlaydi.
 *
 * Tartib: S3/MinIO → fayl tizimi → xotira.
 *
 * Fayl tizimi varianti joylash muhiti uchun (cPanel): u yerda obyekt
 * saqlash yo'q, lekin doimiy disk bor (`docs/OPEN-QUESTIONS.md` Q18).
 *
 * Production'da XOTIRADAGI variant RUXSAT ETILMAYDI: u qayta ishga
 * tushirishda barcha fayllarni yo'qotadi, shuning uchun ikkala haqiqiy
 * variantdan biri sozlanmasa ilova ko'tarilmaydi.
 */
@Global()
@Module({
  providers: [
    MemoryStorage,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: AppConfig, memory: MemoryStorage): StorageAdapter => {
        const logger = new Logger('StorageModule');

        if (config.hasS3) {
          return new S3Storage(config);
        }

        if (config.hasFilesystemStorage) {
          logger.log('Fayl tizimida saqlash ishlatilyapti');
          return new FilesystemStorage(config);
        }

        if (config.isProduction) {
          throw new Error(
            'Saqlash sozlanmagan. S3 (S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY) ' +
              'yoki fayl tizimi (MEDIA_ROOT/MEDIA_PUBLIC_URL/MEDIA_SIGNING_SECRET) ' +
              "sozlanishi shart. Production'da xotiradagi saqlash ishlatilmaydi — " +
              "u qayta ishga tushirishda barcha fayllarni yo'qotadi.",
          );
        }

        logger.warn('Saqlash sozlanmagan — xotiradagi variant (faqat lokal)');
        return memory;
      },
      inject: [AppConfig, MemoryStorage],
    },
  ],
  exports: [STORAGE_ADAPTER, MemoryStorage],
})
export class StorageModule {}
