import { type ApiError } from '@barff/types';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Barcha xato javoblarining yagona shakli (CLAUDE.md §11).
 * Tip `@barff/types` dan keladi — frontend ham aynan shuni o'qiydi.
 */
export type ApiErrorBody = ApiError;

/** Swagger hujjati uchun. Faqat tasvirlash vazifasini bajaradi. */
export class ApiErrorDto implements ApiErrorBody {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: "So'rov ma'lumotlari noto'g'ri" })
  message: string;

  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code: string;

  @ApiProperty({ example: '2f1c9e2a-3b44-4f1e-9a0c-1d6b7c8e9f01' })
  requestId: string;

  @ApiProperty({
    required: false,
    description: "Maydonlar bo'yicha validatsiya xatolari",
    example: { phone: ["Telefon raqami noto'g'ri (+998 XX XXX XX XX)"] },
  })
  details?: Record<string, string[]>;
}
