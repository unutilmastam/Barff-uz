import { type ApiError } from '@barff/types';

/**
 * API mijozi.
 *
 * Server javobi har doim bitta shaklda keladi (CLAUDE.md §11), shuning uchun
 * xatolar ham bitta tipga aylantiriladi — chaqiruvchi kod `response.ok` ni
 * qo'lda tekshirib yurmaydi.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** Maydonga tegishli birinchi xato — forma ostida ko'rsatish uchun. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

function baseUrl(): string {
  const url = process.env['NEXT_PUBLIC_API_BASE_URL'];
  // Sozlanmagan bo'lsa lokal API. Production build'da bu qiymat majburiy
  // beriladi (S40), shuning uchun bu yerda jim ravishda noto'g'ri manzilga
  // ketish xavfi yo'q.
  return url !== undefined && url.length > 0 ? url : 'http://localhost:3000/api/v1';
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** `Accept-Language` uchun. Serverdagi kontent shu tilda qaytadi. */
  locale?: string;
  /**
   * Next.js kesh muddati (soniya).
   *
   * `RequestInit` da bunday maydon yo'q — u Next'ning `fetch` ustidagi
   * kengaytmasi. Shuning uchun u shu yerda ANIQ e'lon qilinadi va
   * so'rovga `next: { revalidate }` sifatida uzatiladi; aks holda
   * `...rest` orqali o'tkazilgan noma'lum kalit jimgina yo'qolardi.
   */
  revalidate?: number;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, locale, headers, revalidate, ...rest } = options;

  /*
    Fayl yuklash `FormData` bilan ketadi va u O'ZGARTIRILMAYDI.

    `JSON.stringify(formData)` `"{}"` beradi — ya'ni fayl yo'qoladi va
    server bo'sh so'rov oladi. `Content-Type` ham QO'YILMAYDI: uni
    brauzer `boundary` bilan birga o'zi qo'yishi kerak, aks holda
    server qismlarni ajrata olmaydi.
  */
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    headers: {
      ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(locale !== undefined ? { 'Accept-Language': locale } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: isFormData ? (body as FormData) : JSON.stringify(body) } : {}),
    // Cookie'lar bilan autentifikatsiya (S04) — token'lar HttpOnly cookie'da.
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

function toApiError(status: number, payload: unknown): ApiRequestError {
  const body = (payload ?? {}) as Partial<ApiError>;

  return new ApiRequestError(
    body.statusCode ?? status,
    body.code ?? 'UNKNOWN_ERROR',
    // Server xabari bo'lmasa ham foydalanuvchiga ko'rsatiladigan matn
    // komponentda tarjima kalitidan olinadi — bu yerda faqat zaxira.
    body.message ?? `HTTP ${status}`,
    body.requestId,
    body.details,
  );
}
