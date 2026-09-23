import { loginSchema } from '@barff/validation';
import { z } from 'zod';
import { createZodDto } from '../../common/validation/zod-dto';

export class LoginDto extends createZodDto(loginSchema) {}

/**
 * Refresh token odatda HttpOnly cookie'dan olinadi. Brauzerdan tashqaridagi
 * mijozlar (mobil ilova, server-server) uchun tanada ham yuborish mumkin.
 *
 * TANA UMUMAN BO'LMASLIGI MUMKIN va bu NORMAL holat: brauzer
 * `/auth/refresh` va `/auth/logout` ni tanasiz chaqiradi, chunki token
 * cookie'da. Shu sababli obyektning o'zi ham ixtiyoriy.
 *
 * Busiz nima bo'lardi: tanasiz so'rov "expected object, received
 * undefined" bilan `400` olardi — ya'ni chiqish AMALDA ISHLAMASDI
 * (foydalanuvchi "chiqdim" deb o'ylab, sessiyasi ochiq qolardi) va
 * token yangilash ham hech qachon bajarilmasdi.
 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .optional()
  .default({});

export class RefreshDto extends createZodDto(refreshSchema) {}
