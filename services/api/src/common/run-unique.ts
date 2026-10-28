import { ConflictException } from '@nestjs/common';
import { Prisma } from '@barff/db';

/**
 * Unikallik xatosini tushunarli javobga aylantiradi.
 *
 * Prisma `P2002` ni qaytaradi; uni ushlamasak, mijoz `500` olardi va
 * qaysi maydon takrorlanganini bilmasdi.
 */
export async function runUnique<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.['target'];
      const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'maydon');

      throw new ConflictException({
        message: `Bu qiymat allaqachon band: ${fields}`,
        code: 'DUPLICATE_VALUE',
        details: { [fields]: ['Bu qiymat allaqachon ishlatilgan'] },
      });
    }
    throw error;
  }
}
