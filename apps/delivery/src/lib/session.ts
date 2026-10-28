import { cookies } from 'next/headers';

/**
 * Haydovchi sessiyasi — SERVERDA o'qiladi.
 *
 * Rol YETARLI EMAS: `DRIVER` roli bor foydalanuvchida haydovchi
 * PROFILI bo'lmasligi mumkin (S32). O'shanda u kira oladi, lekin
 * yetkazmalari yo'q — va sabab ko'rinib turishi kerak, aks holda
 * u bo'sh ekranni "ilova buzilgan" deb tushunadi.
 *
 * DIQQAT: bu ma'lumot faqat KO'RINISHNI hal qiladi. Har bir
 * amalning haqiqiy ruxsati SERVERDA tekshiriladi (CLAUDE.md §3).
 */
export interface DriverSession {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

function baseUrl(): string {
  const url = process.env['NEXT_PUBLIC_API_BASE_URL'];

  if (url !== undefined && url.length > 0) return url;

  // PRODUCTION'DA JIM `localhost` YO'Q: qiymat qurish paytida bundle'ga yoziladi,
  // berilmasa sayt serverda ochiladi-yu, API'ga `localhost` ga so'rov ketadi.
  // `NODE_ENV` qurishda o'rniga qo'yiladi, shuning uchun quyidagi lokal
  // zaxira production bundle'dan butunlay tushib ketadi (F01).
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL berilmagan (docs/DEPLOY-CPANEL.md §6, `pnpm release:cpanel`)',
    );
  }

  return 'http://localhost:3000/api/v1';
}

export async function getSession(): Promise<DriverSession | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  if (header.length === 0) return null;

  try {
    const response = await fetch(`${baseUrl()}/auth/me`, {
      headers: { cookie: header },
      // Sessiya HECH QACHON keshlanmaydi.
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as DriverSession;
  } catch {
    /*
      API ishlamayotgan bo'lsa "kirilmagan" holatga tushadi.

      HAYDOVCHI UCHUN BU YETARLI EMAS va buni bilib turish kerak:
      tarmoqsiz joyda sessiya tekshiruvi ham yiqiladi. Shuning
      uchun ASOSIY ekran serverdan emas, MIJOZDAN quriladi va
      oflayn ishlaydi (`OfflineGate`).
    */
    return null;
  }
}

/** Haydovchimi — yetkazma ko'ra oladimi. */
export function isDriver(session: DriverSession | null): boolean {
  return session?.permissions.includes('delivery.view.own') === true;
}
