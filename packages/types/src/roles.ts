/**
 * Foydalanuvchi rollari (CLAUDE.md §3).
 *
 * DIQQAT: ruxsatlar SERVER tomonda tekshiriladi. Bu tiplar faqat UI'ni
 * moslashtirish uchun — frontend hech qachon avtorizatsiyani hal qilmaydi (§3, §12).
 */
export const ROLES = [
  'VISITOR',
  'DEALER',
  'SALES',
  'WAREHOUSE',
  'LOGISTICS',
  'DRIVER',
  'ADMIN',
] as const;
export type Role = (typeof ROLES)[number];

/** Tizimga kira oladigan rollar (VISITOR — autentifikatsiyasiz mehmon). */
export const AUTHENTICATED_ROLES = ROLES.filter((role) => role !== 'VISITOR');

/** Qaysi rol qaysi ilovaga kiradi. */
export const ROLE_APPS = {
  VISITOR: ['web'],
  DEALER: ['dealer'],
  SALES: ['admin'],
  WAREHOUSE: ['admin'],
  LOGISTICS: ['admin'],
  DRIVER: ['delivery'],
  ADMIN: ['admin'],
} as const satisfies Record<Role, readonly string[]>;
