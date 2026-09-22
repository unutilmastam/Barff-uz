import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { MediaKind, MediaVisibility, Prisma } from '@barff/db';
import { type Paginated } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest, type PageRequest } from '../common/dto/pagination';
import { AppConfig } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessor } from './processing/image-processor';
import {
  SIGNATURE_PROBE_BYTES,
  detectMime,
  extensionFor,
  isImage,
  type DetectedMime,
} from './processing/file-signature';
import { STORAGE_ADAPTER, type StorageAdapter } from './storage/storage.adapter';

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  visibility: MediaVisibility;
  actor?: { id: string; email: string };
  ctx: RequestContext;
}

export interface MediaVariantRecord {
  label: string;
  key: string;
  width: number;
  format: string;
  mimeType: string;
  byteSize: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly images: ImageProcessor,
    private readonly audit: AuditService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  /**
   * Yuklash quvuri (CLAUDE.md §20):
   * hajm -> imzo bo'yicha tur -> qayta ishlash -> saqlash -> metadata.
   *
   * Tartib muhim: tur tekshirilmasdan sharp'ga berilsa, u ixtiyoriy
   * faylni ochishga urinardi.
   */
  async upload(input: UploadInput) {
    const { maxBytes } = this.config.media;

    if (input.buffer.byteLength === 0) {
      throw new BadRequestException({ message: "Fayl bo'sh", code: 'EMPTY_FILE' });
    }

    if (input.buffer.byteLength > maxBytes) {
      throw new PayloadTooLargeException({
        message: `Fayl juda katta. Eng ko'pi ${Math.floor(maxBytes / 1024 / 1024)} MB`,
        code: 'FILE_TOO_LARGE',
      });
    }

    const mime = detectMime(input.buffer.subarray(0, SIGNATURE_PROBE_BYTES));

    if (mime === null) {
      // Kengaytma yoki `Content-Type` emas, aynan MAZMUN rad etildi.
      throw new UnsupportedMediaTypeException({
        message: "Fayl turi qo'llab-quvvatlanmaydi",
        code: 'UNSUPPORTED_FILE_TYPE',
      });
    }

    const checksum = createHash('sha256').update(input.buffer).digest('hex');
    const id = randomUUID();
    const key = this.buildKey(id, mime, input.visibility);

    const kind = isImage(mime) ? MediaKind.IMAGE : MediaKind.DOCUMENT;

    let width: number | null = null;
    let height: number | null = null;
    let blurDataUrl: string | null = null;
    const variantRecords: MediaVariantRecord[] = [];

    if (kind === MediaKind.IMAGE) {
      const processed = await this.images.process(input.buffer, mime);
      width = processed.width;
      height = processed.height;
      blurDataUrl = processed.blurDataUrl;

      for (const variant of processed.variants) {
        const variantKey = `${this.keyPrefix(input.visibility)}/${id}/${variant.label}.${variant.format}`;

        await this.storage.put({
          key: variantKey,
          body: variant.body,
          contentType: variant.mimeType,
          visibility: input.visibility === MediaVisibility.PUBLIC ? 'public' : 'private',
        });

        variantRecords.push({
          label: variant.label,
          key: variantKey,
          width: variant.width,
          format: variant.format,
          mimeType: variant.mimeType,
          byteSize: variant.byteSize,
        });
      }
    }

    await this.storage.put({
      key,
      body: input.buffer,
      contentType: mime,
      visibility: input.visibility === MediaVisibility.PUBLIC ? 'public' : 'private',
      originalName: input.originalName,
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        id,
        key,
        originalName: input.originalName.slice(0, 255),
        mimeType: mime,
        byteSize: input.buffer.byteLength,
        kind,
        visibility: input.visibility,
        width,
        height,
        blurDataUrl,
        variants:
          variantRecords.length > 0
            ? (variantRecords as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        checksum,
        uploadedById: input.actor?.id ?? null,
      },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.MEDIA_UPLOADED,
      entity: 'MediaAsset',
      entityId: asset.id,
      ...(input.actor !== undefined
        ? { actorId: input.actor.id, actorEmail: input.actor.email }
        : {}),
      after: {
        key,
        mimeType: mime,
        byteSize: input.buffer.byteLength,
        visibility: input.visibility,
      },
      ...input.ctx,
    });

    this.logger.log(`Yuklandi: ${key} (${mime}, ${input.buffer.byteLength} bayt)`);

    return asset;
  }

  async list(query: {
    page: number;
    limit: number;
    sortOrder?: 'asc' | 'desc' | undefined;
    // `| undefined` aniq yozilgan: `exactOptionalPropertyTypes` yoqilganda
    // Zod'ning `.optional()` natijasi aynan shunday bo'ladi.
    kind?: MediaKind | undefined;
    visibility?: MediaVisibility | undefined;
  }) {
    const request: PageRequest = toPageRequest(query);

    const where: Prisma.MediaAssetWhereInput = {
      deletedAt: null,
      ...(query.kind !== undefined ? { kind: query.kind } : {}),
      ...(query.visibility !== undefined ? { visibility: query.visibility } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: request.sortOrder },
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return paginate(items, total, request) as Paginated<(typeof items)[number]>;
  }

  async findById(id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, deletedAt: null } });

    if (asset === null) {
      throw new NotFoundException({ message: 'Fayl topilmadi', code: 'MEDIA_NOT_FOUND' });
    }

    return asset;
  }

  /**
   * Faylga kirish manzili.
   *
   * Maxfiy fayl uchun har safar YANGI imzolangan havola beriladi —
   * doimiy havola nusxalanib tarqalsa, uni bekor qilib bo'lmasdi.
   */
  async resolveUrl(id: string): Promise<{ url: string; expiresInSeconds: number | null }> {
    const asset = await this.findById(id);

    if (asset.visibility === MediaVisibility.PUBLIC) {
      return { url: this.storage.publicUrl(asset.key), expiresInSeconds: null };
    }

    const ttl = this.config.media.signedUrlTtl;
    return { url: await this.storage.signedUrl(asset.key, ttl), expiresInSeconds: ttl };
  }

  /**
   * O'chirish.
   *
   * Bazadagi yozuv YUMSHOQ o'chiriladi (fayl boshqa yozuvlarda
   * ishlatilayotgan bo'lishi mumkin), obyektlar esa haqiqatan o'chadi —
   * ular joy egallaydi va saqlanib turishi uchun sabab yo'q.
   */
  async remove(id: string, actor: { id: string; email: string }, ctx: RequestContext) {
    const asset = await this.findById(id);

    const keys = [asset.key, ...this.variantKeys(asset.variants)];

    for (const key of keys) {
      // Bitta obyekt o'chmasa ham qolganlari o'chirilishi kerak.
      await this.storage.delete(key).catch((error: unknown) => {
        this.logger.warn(
          `Obyektni o'chirib bo'lmadi: ${key} — ${error instanceof Error ? error.message : 'noma‘lum'}`,
        );
      });
    }

    await this.prisma.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.audit.record({
      action: AUDIT_ACTIONS.MEDIA_DELETED,
      entity: 'MediaAsset',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { key: asset.key, mimeType: asset.mimeType },
      ...ctx,
    });
  }

  private variantKeys(variants: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(variants)) return [];

    return variants
      .map((variant) =>
        typeof variant === 'object' && variant !== null && 'key' in variant
          ? String((variant as { key: unknown }).key)
          : null,
      )
      .filter((key): key is string => key !== null);
  }

  private keyPrefix(visibility: MediaVisibility): string {
    return visibility === MediaVisibility.PUBLIC ? 'public' : 'private';
  }

  /**
   * Obyekt kaliti.
   *
   * Mijoz bergan fayl nomi kalitga KIRMAYDI: undagi `../` yoki boshqa
   * belgilar saqlash tuzilmasidan chiqib ketishga urinish bo'lishi mumkin.
   * Kengaytma ham aniqlangan turdan olinadi.
   */
  private buildKey(id: string, mime: DetectedMime, visibility: MediaVisibility): string {
    return `${this.keyPrefix(visibility)}/${id}/original.${extensionFor(mime)}`;
  }
}
