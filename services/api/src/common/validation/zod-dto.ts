import { type z } from 'zod';

/**
 * Zod sxemasini NestJS DTO klassiga aylantiradi.
 *
 * NEGA class-validator emas: `@barff/validation` dagi sxemalar web, dealer va
 * admin ilovalarida ham ishlatiladi. Agar server uchun alohida class-validator
 * DTO yozilsa, bir xil qoida ikki joyda turadi va vaqt o'tib bir-biridan
 * uzoqlashadi. Zod bitta manba bo'lib qoladi.
 *
 * `whitelist` o'rnida Zod obyektlari standart holatda noma'lum maydonlarni
 * olib tashlaydi; `transform` o'rnida esa sxemaning o'z transformatsiyalari
 * (masalan, telefonni normallashtirish) ishlaydi.
 */
export interface ZodDtoClass<TOutput = unknown, TInput = unknown> {
  new (): TOutput;
  zodSchema: z.ZodType<TOutput, TInput>;
  jsonSchema: Record<string, unknown>;
}

export function createZodDto<TOutput, TInput>(
  schema: z.ZodType<TOutput, TInput>,
): ZodDtoClass<TOutput, TInput> {
  class Dto {
    static zodSchema = schema;
    static jsonSchema = toOpenApiSchema(schema);
  }

  return Dto as unknown as ZodDtoClass<TOutput, TInput>;
}

export function isZodDto(value: unknown): value is ZodDtoClass {
  return typeof value === 'function' && 'zodSchema' in value;
}

/**
 * Zod 4 ning o'z JSON Schema eksporti. Qo'shimcha kutubxona kerak emas.
 * `io: 'input'` — Swagger mijoz YUBORADIGAN shaklni ko'rsatishi kerak,
 * transformatsiyadan keyingi natijani emas.
 */
export function toOpenApiSchema(schema: z.ZodType): Record<string, unknown> {
  return schema.toJSONSchema({
    io: 'input',
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
}
