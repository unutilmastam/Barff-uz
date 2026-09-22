import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { type ZodDtoClass } from '../validation/zod-dto';

/**
 * Zod DTO ni Swagger hujjatiga ulaydi.
 *
 * `@nestjs/swagger` klass metadata'sini o'qiydi, Zod sxemasini esa bilmaydi —
 * shuning uchun JSON Schema ni qo'lda uzatamiz.
 */
export function ApiZodBody(dto: ZodDtoClass, description?: string) {
  return applyDecorators(
    ApiBody({
      schema: dto.jsonSchema,
      ...(description !== undefined ? { description } : {}),
    }),
  );
}

/** Query obyektini alohida parametrlarga yoyadi. */
export function ApiZodQuery(dto: ZodDtoClass) {
  const schema = dto.jsonSchema as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };

  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  return applyDecorators(
    ...Object.entries(properties).map(([name, prop]) =>
      ApiQuery({
        name,
        required: required.has(name),
        schema: prop,
        ...(typeof prop['description'] === 'string' ? { description: prop['description'] } : {}),
      }),
    ),
  );
}
