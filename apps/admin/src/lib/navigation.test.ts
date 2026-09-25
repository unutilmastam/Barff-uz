import { describe, expect, it } from 'vitest';
import { type Permission } from '@barff/types';
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

    // S19 CMS, S23 narx qoidalari, S29 dilerlar, S30 ombor.
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
      '/warehouse/movements',
      '/system/settings',
    ]);
  });

  it('havolalar takrorlanmaydi', () => {
    const hrefs = ALL_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
