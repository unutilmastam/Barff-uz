import { MediaKind, MediaVisibility } from '@barff/db';
import { paginationQuerySchema } from '@barff/validation';
import { z } from 'zod';
import { createZodDto } from '../../common/validation/zod-dto';

export const mediaListQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(MediaKind).optional(),
  visibility: z.enum(MediaVisibility).optional(),
});

export class MediaListQueryDto extends createZodDto(mediaListQuerySchema) {}

/**
 * Yuklash parametrlari.
 *
 * Standart holat — `PRIVATE`. Fayl ommaviy bo'lishi uchun ANIQ so'ralishi
 * kerak; teskarisi bo'lsa, maxfiy hujjat tasodifan ochiq qolib ketardi.
 */
export const mediaUploadSchema = z.object({
  visibility: z.enum(MediaVisibility).default(MediaVisibility.PRIVATE),
});

export class MediaUploadDto extends createZodDto(mediaUploadSchema) {}
