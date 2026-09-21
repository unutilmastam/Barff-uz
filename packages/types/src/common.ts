/** Qo'llab-quvvatlanadigan tillar (CLAUDE.md §18). */
export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Ko'p tilli matn. Mahsulot/yangilik kontenti shu ko'rinishda saqlanadi. */
export type Localized<T = string> = Record<Locale, T>;

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Ro'yxat so'rovlari uchun umumiy parametrlar (CLAUDE.md §11). */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/** Sahifalangan javobning yagona shakli — barcha ro'yxat endpoint'lari shuni qaytaradi. */
export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/**
 * Xatolarning yagona shakli (CLAUDE.md §11).
 * `requestId` har so'rovga biriktiriladi — loglarda izlash uchun.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  requestId: string;
  /** Maydon darajasidagi validatsiya xatolari. */
  details?: Record<string, string[]>;
}

/** Ma'lumotlar bazasidagi yozuvlarning umumiy maydonlari. */
export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}
