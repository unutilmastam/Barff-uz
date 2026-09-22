import { Global, Logger, Module } from '@nestjs/common';
import { AppConfig } from '../../config/app.config';
import { MemoryStorage } from './memory.storage';
import { S3Storage } from './s3.storage';
import { STORAGE_ADAPTER, type StorageAdapter } from './storage.adapter';

/**
 * Saqlash provayderini tanlaydi.
 *
 * S3 sozlamalari to'liq bo'lsa — S3/MinIO, aks holda xotiradagi variant.
 * Production'da xotiradagi variant RUXSAT ETILMAYDI: u qayta ishga
 * tushirishda barcha fayllarni yo'qotadi, shuning uchun sozlama
 * yetishmasa ilova ko'tarilmaydi.
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

        if (config.isProduction) {
          throw new Error(
            "S3 sozlamalari yetishmayapti. Production'da xotiradagi saqlash " +
              "ishlatilmaydi — u qayta ishga tushirishda barcha fayllarni yo'qotadi.",
          );
        }

        logger.warn('S3 sozlanmagan — xotiradagi saqlash ishlatilyapti (faqat lokal)');
        return memory;
      },
      inject: [AppConfig, MemoryStorage],
    },
  ],
  exports: [STORAGE_ADAPTER, MemoryStorage],
})
export class StorageModule {}
