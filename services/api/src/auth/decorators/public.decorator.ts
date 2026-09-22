import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Endpoint'ni autentifikatsiyasiz ochiq qiladi.
 *
 * Standart holat — YOPIQ: `JwtAuthGuard` global guard sifatida ishlaydi.
 * Shu sababli yangi endpoint qo'shilganda uni himoyalashni unutib bo'lmaydi;
 * aksincha, ochiq qilish uchun aniq qaror kerak bo'ladi.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
