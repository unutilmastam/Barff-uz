import { type AdminNavGroup } from './navigation';

/*
  ALOHIDA FAYL — MIJOZ UCHUN.

  `Sidebar` mijoz komponenti, va `navigation.ts` `session.ts` ni
  o'qiydi, u esa `next/headers` ni — YA'NI FAQAT SERVERDA ishlaydi.
  Bu funksiya o'sha faylda turganda qurish to'xtadi: mijoz to'plami
  server modulini tortib kelardi.

  `AdminNavGroup` — TUR, u kompilyatsiyada yo'qoladi, shuning uchun
  uni import qilish xavfsiz.
*/
/**
 * Menyuda QAYSI bo'lim yonadi.
 *
 * Prefiks bo'yicha mos kelish yetarli emas edi. `/logistics` va
 * `/logistics/fleet` ikkalasi ham menyuda turadi, va `startsWith`
 * bilan «Park» sahifasida IKKALASI ham faol ko'rinardi — ekran
 * o'quvchi esa ikkita `aria-current="page"` ni o'qib, foydalanuvchi
 * qayerdaligini yashirardi.
 *
 * Shuning uchun ENG ANIQ mos keluvchi tanlanadi: `/logistics/fleet`
 * `/logistics` dan uzunroq va u yutadi.
 *
 * Mos kelish SEGMENT chegarasi bo'yicha: `/logistics` `/logistics-x`
 * ni yoqmasligi kerak.
 */
export function activeHref(groups: AdminNavGroup[], pathname: string): string | null {
  const matches = groups
    .flatMap((group) => group.items)
    .filter((item) => item.ready)
    .map((item) => item.href)
    .filter((href) =>
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`),
    );

  return matches.reduce<string | null>(
    (best, href) => (best === null || href.length > best.length ? href : best),
    null,
  );
}
