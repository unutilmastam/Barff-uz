import { SetMetadata } from '@nestjs/common';
import { type Permission } from '@barff/types';

export const PERMISSIONS_KEY = 'auth:permissions';

/**
 * Endpoint uchun zarur ruxsatlar. BARCHASI bo'lishi shart.
 *
 * Rol o'rniga ruxsat bo'yicha cheklash afzal: rol tarkibi CMS orqali
 * o'zgarishi mumkin, ruxsat nomi esa kodga bog'langan.
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
