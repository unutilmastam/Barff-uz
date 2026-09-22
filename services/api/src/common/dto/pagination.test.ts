import { paginationQuerySchema } from '@barff/validation';
import { describe, expect, it } from 'vitest';
import { paginate, resolveSortColumn, toPageRequest } from './pagination';

describe('toPageRequest', () => {
  it('skip va take ni hisoblaydi', () => {
    expect(toPageRequest({ page: 3, limit: 20 })).toMatchObject({ skip: 40, take: 20 });
  });

  it('birinchi sahifada skip nolga teng', () => {
    expect(toPageRequest({ page: 1, limit: 10 }).skip).toBe(0);
  });

  it('sortOrder berilmasa desc ishlatadi', () => {
    expect(toPageRequest({ page: 1, limit: 20 })).toMatchObject({
      page: 1,
      limit: 20,
      skip: 0,
      sortOrder: 'desc',
    });
  });

  it('sxema orqali otgan query bilan mos ishlaydi', () => {
    const query = paginationQuerySchema.parse({ page: '2', limit: '25' });
    expect(toPageRequest(query)).toMatchObject({ page: 2, limit: 25, skip: 25, take: 25 });
  });
});

describe('paginate', () => {
  it('meta ni togri toldiradi', () => {
    const result = paginate(['a', 'b'], 45, toPageRequest({ page: 2, limit: 20 }));
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
    });
    expect(result.items).toEqual(['a', 'b']);
  });

  it('oxirgi sahifada hasNextPage false boladi', () => {
    const result = paginate(['a'], 41, toPageRequest({ page: 3, limit: 20 }));
    expect(result.meta).toMatchObject({ totalPages: 3, hasNextPage: false });
  });

  it('bosh royxat uchun totalPages nolga teng', () => {
    const result = paginate([], 0, toPageRequest({ page: 1, limit: 20 }));
    expect(result.meta).toMatchObject({ totalPages: 0, hasNextPage: false });
  });
});

describe('resolveSortColumn', () => {
  const allowed = ['createdAt', 'name'] as const;

  it('royxatdagi ustunni qaytaradi', () => {
    expect(resolveSortColumn('name', allowed, 'createdAt')).toBe('name');
  });

  it('royxatda yoq ustunni fallback bilan almashtiradi', () => {
    expect(resolveSortColumn('passwordHash', allowed, 'createdAt')).toBe('createdAt');
  });

  it('undefined uchun fallback beradi', () => {
    expect(resolveSortColumn(undefined, allowed, 'createdAt')).toBe('createdAt');
  });
});
