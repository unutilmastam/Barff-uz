import { describe, expect, it } from 'vitest';
import { type Permission } from '@barff/types';
import { activeHref } from './nav-active';
import { ALL_NAV_GROUPS, visibleNav } from './navigation';
import { type AdminSession } from './session';

function session(permissions: Permission[]): AdminSession {
  return {
    id: '1',
    email: 'sinov@barff.uz',
    fullName: 'Sinov',
    roles: ['SALES'],
    permissions,
  };
}

describe('admin navigatsiyasi', () => {
  it('ruxsati yoq bolim menyuda KORINMAYDI', () => {
    const groups = visibleNav(session(['leads.view']));
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).toContain('/leads');
    expect(hrefs).not.toContain('/products');
    expect(hrefs).not.toContain('/system/users');
  });

  it('bosh bolib qolgan guruh chiqarilmaydi', () => {
    const groups = visibleNav(session(['leads.view']));

    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    expect(groups.map((group) => group.label)).toEqual(['Savdo']);
  });

  it('sessiya yoq bolsa menyu BOSH', () => {
    expect(visibleNav(null)).toEqual([]);
  });

  it('har bir bolim ruxsat talab qiladi', () => {
    // Ruxsatsiz bo'lim bo'lsa, u hammaga ko'rinib qolardi.
    for (const group of ALL_NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.permission, `${item.href}`).toBeTruthy();
      }
    }
  });

  /**
   * Qurilmagan bo'limga HAVOLA qo'yilmasligi kerak.
   *
   * Bu 404 dan ham yomonroq: Next havolani oldindan yuklamoqchi
   * bo'lib, so'rovni mangu osiltirib qo'yadi.
   */
  it('qurilmagan bolim `ready: false` deb belgilangan', () => {
    const ready = ALL_NAV_GROUPS.flatMap((group) =>
      group.items.filter((item) => item.ready).map((item) => item.href),
    );

    // S19 CMS, S23 narx qoidalari, S29 dilerlar, S30-S31 ombor, S34 logistika.
    expect(ready).toEqual([
      '/',
      '/content/news',
      '/content/certificates',
      '/content/gallery',
      '/content/documents',
      '/content/pages',
      '/media',
      '/products',
      '/leads',
      '/orders',
      '/pricing',
      '/dealers',
      '/warehouse/stock',
      '/warehouse/picking',
      '/warehouse/movements',
      '/logistics',
      '/logistics/routes',
      '/logistics/fleet',
      '/system/settings',
    ]);
  });

  /**
   * Park sahifasi `delivery.manage` talab qiladi.
   *
   * `delivery.view` bilan ochilgan bo'lim bo'sh nomzod ro'yxatini
   * ko'rsatardi: sabab 403 ekani ko'rinmasdi.
   */
  it('Park bolimi delivery.manage talab qiladi', () => {
    const hrefs = visibleNav(session(['delivery.view'])).flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(hrefs).toContain('/logistics');
    expect(hrefs).not.toContain('/logistics/fleet');
    expect(hrefs).not.toContain('/logistics/routes');
  });

  it('havolalar takrorlanmaydi', () => {
    const hrefs = ALL_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('faol bolim', () => {
  const groups = ALL_NAV_GROUPS;

  /**
   * FAOL BO'LIM BITTA.
   *
   * `startsWith` bilan «Park» sahifasida «Yetkazish» ham yonardi:
   * menyuda ikkita `aria-current="page"` bo'lib, ekran o'quvchi
   * foydalanuvchi qayerdaligini aytmay qolardi.
   */
  it('eng aniq mos keluvchi tanlanadi', () => {
    expect(activeHref(groups, '/logistics/fleet')).toBe('/logistics/fleet');
    expect(activeHref(groups, '/logistics/routes')).toBe('/logistics/routes');
    expect(activeHref(groups, '/logistics')).toBe('/logistics');
  });

  it('ichki sahifada ota bolim yonadi', () => {
    expect(activeHref(groups, '/orders/01a0f0a6-0000-7000-8000-000000000000')).toBe('/orders');
    expect(activeHref(groups, '/warehouse/picking/abc')).toBe('/warehouse/picking');
  });

  /** `/` faqat AYNAN mos kelganda — aks holda u hamma joyda yonardi. */
  it('bosh sahifa faqat aynan mos kelganda', () => {
    expect(activeHref(groups, '/')).toBe('/');
    expect(activeHref(groups, '/orders')).toBe('/orders');
  });

  /** Segment chegarasi: `/logistics` `/logistics-arxiv` ni yoqmaydi. */
  it('segment chegarasi hisobga olinadi', () => {
    expect(activeHref(groups, '/logistics-arxiv')).toBeNull();
  });

  /** Qurilmagan bo'lim havola emas — u yona olmaydi. */
  it('qurilmagan bolim faol bolmaydi', () => {
    expect(activeHref(groups, '/system/users')).toBeNull();
  });
});
