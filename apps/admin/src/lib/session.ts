import { cookies } from 'next/headers';
import { type Permission } from '@barff/types';

/**
 * Joriy foydalanuvchi — SERVERDA o'qiladi.
 *
 * MUHIM: bu ma'lumot faqat MENYU ko'rinishini hal qiladi. Har bir
 * amalning haqiqiy ruxsati SERVERDA, API tomonida tekshiriladi
 * (CLAUDE.md §3). Menyuni yashirish — qulaylik, himoya EMAS: endpoint
 * to'g'ridan-to'g'ri chaqirilsa ham `403` qaytadi.
 */
export interface AdminSession {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: Permission[];
}

function baseUrl(): string {
  const url = process.env['NEXT_PUBLIC_API_BASE_URL'];

  return url !== undefined && url.length > 0 ? url : 'http://localhost:3000/api/v1';
}

/**
 * Sessiyani API'dan oladi.
 *
 * Cookie'lar QO'LDA uzatiladi: server komponentidagi `fetch` brauzer
 * cookie'larini o'zi qo'shmaydi. Token `HttpOnly` cookie'da yashaydi va
 * JavaScript uni o'qiy olmaydi — shuning uchun sessiya server tomonda
 * tekshiriladi.
 */
export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  if (header.length === 0) return null;

  try {
    const response = await fetch(`${baseUrl()}/auth/me`, {
      headers: { cookie: header },
      // Sessiya HECH QACHON keshlanmaydi: keshlangan javob boshqa
      // foydalanuvchiga ko'rsatilishi mumkin edi.
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as AdminSession;
  } catch {
    // API ishlamayotgan bo'lsa ham admin panel "kirilmagan" holatga
    // tushadi — bu eng xavfsiz taxmin.
    return null;
  }
}

/** Foydalanuvchida shu ruxsat bormi. */
export function can(session: AdminSession | null, permission: Permission): boolean {
  return session?.permissions.includes(permission) === true;
}
