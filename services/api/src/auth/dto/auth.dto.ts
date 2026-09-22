import { loginSchema } from '@barff/validation';
import { z } from 'zod';
import { createZodDto } from '../../common/validation/zod-dto';

export class LoginDto extends createZodDto(loginSchema) {}

/**
 * Refresh token odatda HttpOnly cookie'dan olinadi. Brauzerdan tashqaridagi
 * mijozlar (mobil ilova, server-server) uchun tanada ham yuborish mumkin.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export class RefreshDto extends createZodDto(refreshSchema) {}
