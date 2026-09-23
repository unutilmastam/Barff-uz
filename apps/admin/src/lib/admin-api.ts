import { type Paginated } from '@barff/types';
import { apiFetch } from './api-client';

/**
 * Admin API chaqiruvlari.
 *
 * Har biri `credentials: 'include'` bilan ketadi (`api-client.ts`),
 * ya'ni `HttpOnly` cookie'dagi token avtomatik qo'shiladi. Token
 * JavaScript'da saqlanmaydi.
 *
 * RUXSAT bu yerda tekshirilmaydi — u SERVERDA tekshiriladi. Mijozdagi
 * har qanday tekshiruv faqat ortiqcha so'rovni oldini olish uchun.
 */

export interface ListQuery {
  page?: number;
  limit?: number;
  status?: string | undefined;
  search?: string | undefined;
}

function query(params: ListQuery): string {
  const search = new URLSearchParams();

  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 20));
  if (params.status !== undefined && params.status.length > 0) search.set('status', params.status);

  return search.toString();
}

/** Ro'yxat — sahifalangan yoki oddiy massiv bo'lishi mumkin. */
export function adminList<T>(path: string, params: ListQuery = {}): Promise<Paginated<T> | T[]> {
  return apiFetch<Paginated<T> | T[]>(`${path}?${query(params)}`);
}

export function adminGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function adminCreate<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body });
}

export function adminUpdate<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body });
}

/** Upsert — bosqich/bo'lim/SEO/sozlama uchun (`PUT`). */
export function adminPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body });
}

export function adminDelete(path: string): Promise<void> {
  return apiFetch<void>(path, { method: 'DELETE' });
}

/** Javob sahifalanganmi yoki oddiy massivmi — ikkalasini ham qo'llab-quvvatlaydi. */
export function toRows<T>(result: Paginated<T> | T[] | undefined): {
  rows: T[];
  page: number;
  totalPages: number;
} {
  if (result === undefined) return { rows: [], page: 1, totalPages: 1 };
  if (Array.isArray(result)) return { rows: result, page: 1, totalPages: 1 };

  return { rows: result.items, page: result.meta.page, totalPages: result.meta.totalPages };
}
