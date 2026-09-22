import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ImageProcessor } from './processing/image-processor';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [MediaController],
  providers: [MediaService, ImageProcessor],
  exports: [MediaService],
})
export class MediaModule {}
