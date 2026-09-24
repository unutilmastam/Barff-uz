import { type Permission } from '@barff/types';
import { type AdminSession, can } from './session';

/**
 * Admin panel navigatsiyasi (CLAUDE.md §8).
 *
 * Har bir bo'lim uchun KERAKLI RUXSAT ko'rsatilgan. Ruxsat yo'q bo'lsa,
 * bo'lim menyuda ko'rinmaydi.
 *
 * DIQQAT: bu KOSMETIKA. Menyuni yashirish himoya emas — foydalanuvchi
 * manzilni qo'lda yozishi yoki API'ni to'g'ridan-to'g'ri chaqirishi
 * mumkin. Haqiqiy himoya serverda: har bir endpoint `@Permissions`
 * bilan qo'riqlanadi va ruxsat bo'lmasa `403` qaytaradi (CLAUDE.md §3).
 */
export interface AdminNavItem {
  href: string;
  label: string;
  permission: Permission;
  /**
   * Bo'lim QURILGANMI.
   *
   * Qurilmagan bo'lim menyuda KO'RINADI (rejani ko'rsatadi), lekin
   * HAVOLA bo'lmaydi. Sabab ikkita: u 404 berardi, va Next havolani
   * oldindan yuklamoqchi bo'lib so'rovni osiltirib qo'yadi — bu
   * ommaviy saytda o'lchab ko'rilgan xatti-harakat.
   */
  ready: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const GROUPS: AdminNavGroup[] = [
  {
    label: 'Umumiy',
    items: [{ href: '/', label: 'Boshqaruv paneli', permission: 'content.view', ready: true }],
  },
  {
    label: 'Kontent',
    items: [
      { href: '/content/news', label: 'Yangiliklar', permission: 'content.view', ready: true },
      {
        href: '/content/certificates',
        label: 'Sertifikatlar',
        permission: 'content.view',
        ready: true,
      },
      { href: '/content/gallery', label: 'Galereya', permission: 'content.view', ready: true },
      { href: '/content/documents', label: 'Hujjatlar', permission: 'content.view', ready: true },
      {
        href: '/content/pages',
        label: 'Sahifalar va SEO',
        permission: 'content.view',
        ready: true,
      },
      { href: '/media', label: 'Media kutubxona', permission: 'content.view', ready: true },
    ],
  },
  {
    label: 'Katalog',
    items: [
      { href: '/products', label: 'Mahsulotlar', permission: 'products.view', ready: true },
      {
        href: '/products/categories',
        label: 'Kategoriyalar',
        permission: 'products.view',
        ready: false,
      },
    ],
  },
  {
    label: 'Savdo',
    items: [{ href: '/leads', label: 'Arizalar', permission: 'leads.view', ready: true }],
  },
  {
    label: 'Tizim',
    items: [
      { href: '/system/users', label: 'Foydalanuvchilar', permission: 'users.view', ready: false },
      {
        href: '/system/settings',
        label: 'Sozlamalar',
        permission: 'settings.manage',
        ready: true,
      },
      { href: '/system/audit', label: 'Audit jurnali', permission: 'audit.view', ready: false },
    ],
  },
];

/** Foydalanuvchi KO'RA OLADIGAN bo'limlar. Bo'sh guruh tushirib qoldiriladi. */
export function visibleNav(session: AdminSession | null): AdminNavGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(session, item.permission)),
  })).filter((group) => group.items.length > 0);
}

/** Barcha bo'limlar — testlar va tekshiruvlar uchun. */
export const ALL_NAV_GROUPS = GROUPS;
