import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { type DetectedMime } from './file-signature';

export interface ImageVariant {
  label: string;
  width: number;
  format: 'webp' | 'avif';
  body: Buffer;
  mimeType: string;
  byteSize: number;
}

export interface ProcessedImage {
  width: number;
  height: number;
  variants: ImageVariant[];
  /** Kichik, ichki `data:` URL — rasm yuklangunicha ko'rsatiladi. */
  blurDataUrl: string;
}

/**
 * Chiqariladigan kengliklar.
 *
 * Mobil ekranlardan 2x retina desktopgacha. Original kenglikdan kattasi
 * yaratilmaydi — kichik rasmni kattalashtirish sifatni oshirmaydi,
 * faqat baytlarni ko'paytiradi.
 */
const WIDTHS = [320, 640, 1024, 1600] as const;

/** Blur placeholder o'lchami. Kichik bo'lishi shart: u HTML ichiga tushadi. */
const BLUR_WIDTH = 16;

@Injectable()
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  /**
   * Rasmni variantlarga ajratadi.
   *
   * AVIF va WebP ikkalasi ham chiqariladi: AVIF kichikroq, lekin eski
   * brauzerlarda yo'q — `<picture>` ichida ikkalasi berilsa, brauzer
   * o'zi qo'llab-quvvatlaydiganini tanlaydi.
   */
  async process(input: Buffer, mime: DetectedMime): Promise<ProcessedImage> {
    // `failOn: 'none'` — biroz buzilgan, lekin o'qiladigan rasm butun
    // yuklashni to'xtatmasin. Tur allaqachon imzo bo'yicha tekshirilgan.
    const image = sharp(input, { failOn: 'none' });
    const metadata = await image.metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width === 0 || height === 0) {
      throw new Error("Rasm o'lchamlarini aniqlab bo'lmadi");
    }

    const targetWidths = WIDTHS.filter((w) => w <= width);
    // Original juda kichik bo'lsa ham kamida bitta variant kerak.
    if (targetWidths.length === 0) targetWidths.push(width as (typeof WIDTHS)[number]);

    const variants: ImageVariant[] = [];

    for (const targetWidth of targetWidths) {
      for (const format of ['webp', 'avif'] as const) {
        const body = await sharp(input, { failOn: 'none' })
          // `withoutEnlargement` — kichik rasmni cho'zmaydi.
          .resize({ width: targetWidth, withoutEnlargement: true })
          // EXIF va boshqa metadata KO'CHIRILMAYDI: u geolokatsiya va
          // qurilma ma'lumotini o'z ichiga olishi mumkin.
          [format]({ quality: format === 'avif' ? 50 : 72 })
          .toBuffer();

        variants.push({
          label: `${targetWidth}w`,
          width: targetWidth,
          format,
          body,
          mimeType: format === 'avif' ? 'image/avif' : 'image/webp',
          byteSize: body.byteLength,
        });
      }
    }

    this.logger.debug(`${mime}: ${variants.length} ta variant, ${width}x${height}`);

    return { width, height, variants, blurDataUrl: await this.blurPlaceholder(input) };
  }

  private async blurPlaceholder(input: Buffer): Promise<string> {
    const tiny = await sharp(input, { failOn: 'none' })
      .resize({ width: BLUR_WIDTH, withoutEnlargement: true })
      .webp({ quality: 40 })
      .toBuffer();

    return `data:image/webp;base64,${tiny.toString('base64')}`;
  }
}
