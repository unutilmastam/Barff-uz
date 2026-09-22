import { type Paginated, type PaginationQuery } from '@barff/types';
import { paginationQuerySchema } from '@barff/validation';
import { createZodDto } from '../validation/zod-dto';

/**
 * Har bir ro'yxat endpoint'i uchun umumiy query parametrlari (CLAUDE.md §11).
 * Sxema `@barff/validation` dan keladi — frontend ham aynan shuni ishlatadi.
 */
export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}

export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Query'ni ma'lumotlar bazasi uchun `skip`/`take` ga aylantiradi.
 * `page`/`limit` shu yerga yetib kelgunicha sxema tomonidan to'ldirilgan
 * bo'ladi (`paginationQuerySchema` default qiymatlari).
 */
export function toPageRequest(query: PaginationQuery): PageRequest {
  const { page, limit } = query;

  const request: PageRequest = {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder: query.sortOrder ?? 'desc',
  };

  if (query.sortBy !== undefined) request.sortBy = query.sortBy;

  return request;
}

/** Ro'yxat javobini yagona `{ items, meta }` shakliga keltiradi. */
export function paginate<T>(items: readonly T[], total: number, req: PageRequest): Paginated<T> {
  const totalPages = req.limit > 0 ? Math.ceil(total / req.limit) : 0;

  return {
    items: [...items],
    meta: {
      page: req.page,
      limit: req.limit,
      total,
      totalPages,
      hasNextPage: req.page < totalPages,
    },
  };
}

/**
 * `sortBy` ni oq ro'yxat bo'yicha tekshiradi.
 *
 * Mijozdan kelgan ustun nomini to'g'ridan-to'g'ri so'rovga qo'yish mumkin
 * emas — bu ichki ustunlarni ochib qo'yadi va SQL darajasida xavf tug'diradi.
 */
export function resolveSortColumn<T extends string>(
  sortBy: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(sortBy as T) ? (sortBy as T) : fallback;
}
