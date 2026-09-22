import { type Permission, type Role } from '@barff/types';

/** Access token ichidagi ma'lumot. */
export interface AccessTokenPayload {
  /** Foydalanuvchi id (JWT standarti bo'yicha `sub`). */
  sub: string;
  email: string;
  roles: Role[];
}

/**
 * Refresh token ichidagi ma'lumot.
 *
 * `jti` — token nusxasining identifikatori. Redis'da aynan shu kalit
 * saqlanadi, shuning uchun har bir refresh alohida bekor qilinishi mumkin.
 * `family` — bitta kirish sessiyasining barcha refresh token'lari uchun
 * umumiy id: token qayta ishlatilgani aniqlansa, butun oila bekor qilinadi.
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  family: string;
}

/**
 * So'rov davomida mavjud bo'ladigan foydalanuvchi.
 *
 * DIQQAT: `roles` va `permissions` token'dan EMAS, ma'lumotlar bazasidan
 * olinadi. Aks holda admin rolni olib tashlaganidan keyin ham foydalanuvchi
 * token muddati tugaguncha eski huquqlar bilan ishlayverardi.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  permissions: Permission[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token amal qilish muddati (soniya) — klient uchun ma'lumot. */
  expiresIn: number;
}
