import { type ArgumentMetadata, HttpStatus, Injectable, type PipeTransform } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { type z } from 'zod';
import { isZodDto } from './zod-dto';

/**
 * Global validatsiya. `@Body`, `@Query`, `@Param` uchun DTO `createZodDto` dan
 * yaratilgan bo'lsa — sxema bo'yicha tekshiriladi va o'giriladi.
 *
 * Boshqa turdagi metatype'lar (string, number, oddiy klasslar) tegilmaydi —
 * ular controller darajasida hal qilinadi.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype;
    if (!isZodDto(metatype)) return value;

    const result = metatype.zodSchema.safeParse(value);
    if (result.success) return result.data;

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "So'rov ma'lumotlari noto'g'ri",
        code: 'VALIDATION_FAILED',
        details: formatIssues(result.error),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** `{ field: ["xabar"] }` — frontend formalari shu ko'rinishni kutadi. */
function formatIssues(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (out[key] ??= []).push(issue.message);
  }

  return out;
}
