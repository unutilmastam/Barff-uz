import { cookies } from 'next/headers';
import { type DealerStatus } from '@barff/types';

/**
 * Diler sessiyasi — SERVERDA o'qiladi.
 *
 * ADMIN PANELIDAN FARQI: bu yerda rol yetarli EMAS.
 *
 * `DEALER` roli ariza yuborilgan zahoti beriladi (S22), ya'ni u
 * hech narsani ochmaydi. Portalning asosiy qismi faqat TASDIQLANGAN
 * diler uchun ishlaydi, shuning uchun sessiya rol bilan birga
 * DILER HOLATINI ham olib yuradi.
 *
 * DIQQAT: bu ma'lumot faqat KO'RINISHNI hal qiladi. Har bir amalning
 * haqiqiy ruxsati SERVERDA tekshiriladi (`requireActiveDealer`,
 * CLAUDE.md §3) — menyuni yashirish himoya emas.
 */
export interface DealerSession {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  dealer: {
    id: string;
    companyName: string;
    status: DealerStatus;
    statusReason: string | null;
    tier: { code: string; name: string; discountBasisPoints: number } | null;
  } | null;
}

function baseUrl(): string {
  const url = process.env['NEXT_PUBLIC_API_BASE_URL'];

  return url !== undefined && url.length > 0 ? url : 'http://localhost:3000/api/v1';
}

/**
 * Cookie'larni QO'LDA uzatish.
 *
 * Server komponentidagi `fetch` brauzer cookie'larini o'zi
 * qo'shmaydi. Token `HttpOnly` cookie'da yashaydi va JavaScript uni
 * o'qiy olmaydi — shuning uchun sessiya server tomonda tekshiriladi.
 */
async function cookieHeader(): Promise<string> {
  const store = await cookies();

  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

async function get<T>(path: string, cookie: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      headers: { cookie },
      // Sessiya HECH QACHON keshlanmaydi: keshlangan javob boshqa
      // foydalanuvchiga ko'rsatilishi mumkin edi.
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<DealerSession | null> {
  const cookie = await cookieHeader();
  if (cookie.length === 0) return null;

  const user = await get<{ id: string; email: string; fullName: string; roles: string[] }>(
    '/auth/me',
    cookie,
  );

  if (user === null) return null;

  /*
    Diler yozuvi ALOHIDA so'rovda.

    `/auth/me` umumiy: uni admin ham, haydovchi ham ishlatadi.
    Diler ma'lumotini u yerga qo'shish javobni har bir rol uchun
    og'irlashtirardi va kerak bo'lmagan joyga diler ma'lumotini
    sizdirardi.
  */
  const dealer = await get<DealerSession['dealer']>('/dealer/profile', cookie);

  return { ...user, dealer };
}

/**
 * Diler TO'LIQ ishlay oladimi.
 *
 * Shart bitta joyda: u menyuda ham, sahifalarda ham, `layout` da ham
 * ishlatiladi va ular bir-biridan farq qilib ketmasligi kerak.
 */
export function isActive(session: DealerSession | null): boolean {
  return session?.dealer?.status === 'APPROVED';
}
