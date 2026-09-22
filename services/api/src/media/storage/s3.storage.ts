import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app.config';
import { type PutObjectInput, type StorageAdapter, type StoredObject } from './storage.adapter';

/**
 * S3 va MinIO uchun adapter.
 *
 * MinIO S3 API bilan mos, shuning uchun bitta implementatsiya ikkalasiga
 * ham yetadi. Yagona farq — `forcePathStyle`: MinIO subdomen ko'rinishidagi
 * bucket manzillarini qo'llab-quvvatlamaydi.
 */
@Injectable()
export class S3Storage implements StorageAdapter {
  private readonly logger = new Logger(S3Storage.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | undefined;

  constructor(private readonly config: AppConfig) {
    const s3 = config.s3;
    this.bucket = s3.bucket;
    this.publicBaseUrl = s3.publicUrl;

    this.client = new S3Client({
      region: s3.region,
      ...(s3.endpoint !== undefined ? { endpoint: s3.endpoint } : {}),
      forcePathStyle: s3.forcePathStyle,
      credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
    });
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        // ACL QO'YILMAYDI. Bucket ommaviy emas va shunday qolishi kerak
        // (CLAUDE.md §12: "S3 private by default"). Ommaviy fayllar
        // CDN orqali beriladi.
        ...(input.originalName !== undefined
          ? { ContentDisposition: `inline; filename="${sanitizeFilename(input.originalName)}"` }
          : {}),
      }),
    );

    return { key: input.key, byteSize: input.body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const bytes = await response.Body?.transformToByteArray();
    if (bytes === undefined) throw new Error(`Obyekt bo'sh: ${key}`);

    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  publicUrl(key: string): string {
    if (this.publicBaseUrl === undefined) {
      // Sozlanmagan bo'lsa imzolangan havolaga tayanamiz — bucket'ni
      // ochib qo'yishdan ko'ra shu xavfsizroq.
      this.logger.warn('S3_PUBLIC_URL sozlanmagan — ommaviy manzil berib bo‘lmaydi');
      return '';
    }
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
}

/** Fayl nomidagi qo'shtirnoq va yangi qator sarlavhani buzishi mumkin. */
function sanitizeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, '_').slice(0, 200);
}
